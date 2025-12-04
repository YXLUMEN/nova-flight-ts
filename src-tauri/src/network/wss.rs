use crate::network::session::{Session, NEXT_SESSION_ID};
use crate::network::states::{RelayState, Role, ServerHandle, ServerManager, Tx};
use crate::network::util::{format_uuid, is_nil_uuid, parse_excludes, read_var_uint};
use bytes::{Buf, BufMut, BytesMut};
use dashmap::Entry;
use futures_util::stream::SplitStream;
use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use rand::RngCore;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, oneshot, Mutex, OnceCell};
use tokio::time::{timeout, Duration};
use tokio_tungstenite::tungstenite::{Bytes, Message};
use tokio_tungstenite::{accept_async, WebSocketStream};

static SERVER_MANAGER: OnceCell<Mutex<ServerManager>> = OnceCell::const_new();
static OPEN_FLAG: OnceCell<AtomicBool> = OnceCell::const_new();

const MAX_PAYLOAD_LEN: usize = 6144; // 6 KB upper bound for a single frame
const MAX_EXCLUDES: u32 = 16; // exclude uuid count
const MAX_BACKOFF: Duration = Duration::from_secs(5);

#[tauri::command]
pub async fn start_server(port: u16) -> Result<[u8; 32], String> {
    let state_cell = SERVER_MANAGER
        .get_or_init(|| async {
            Mutex::new(ServerManager {
                handle: None,
                stop_tx: None,
            })
        })
        .await;

    OPEN_FLAG
        .get_or_init(|| async { AtomicBool::new(false) })
        .await
        .store(false, Ordering::SeqCst);

    let mut guard = state_cell.lock().await;
    if let Some(handle) = guard.handle.as_ref() {
        return Err(format!("Server already listen on \"{}\"", handle.port));
    }

    let (tx, rx) = oneshot::channel();
    guard.stop_tx = Some(tx);

    // 开始监听
    let addr = format!("0.0.0.0:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            error!("Failed to bind {}: {}", addr, e);
            return Err("Port already in use".into());
        }
    };

    info!("WebSocket server listening on {}", addr);

    // 生成随机密钥
    let mut secret = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut secret);

    let state = Arc::new(RelayState::new());
    tokio::spawn(run_ws_server(listener, state, rx));

    guard.handle = Some(ServerHandle { port, secret });

    Ok(secret)
}

#[tauri::command]
pub async fn stop_server() -> Result<(), String> {
    let Some(state_cell) = SERVER_MANAGER.get() else {
        info!("Server not initialized");
        return Ok(());
    };

    let mut guard = state_cell.lock().await;
    if let Some(tx) = guard.stop_tx.take() {
        let _ = tx.send(());
        info!("Stopping server");
    } else {
        info!("Server not running");
    }

    Ok(())
}

#[tauri::command]
pub fn set_open() {
    if let Some(flag) = OPEN_FLAG.get() {
        flag.store(true, Ordering::SeqCst);
    }
}

#[tauri::command]
pub fn is_open() -> bool {
    if let Some(flag) = OPEN_FLAG.get() {
        return flag.load(Ordering::SeqCst);
    }

    false
}

async fn run_ws_server(
    listener: TcpListener,
    state: Arc<RelayState>,
    mut stop_receiver: oneshot::Receiver<()>,
) {
    let mut backoff = Duration::from_millis(100);
    let mut consecutive_errors = 0u32;

    loop {
        tokio::select! {
                _ = &mut stop_receiver => {
                    info!("Shutting down relay server");
                    state.schedule_shutdown();
                    break;
                }
                accept_res = listener.accept(), if !state.is_shutdown() => {
                    match accept_res {
                    Ok((stream,address)) => {
                        consecutive_errors = 0;
                        backoff = Duration::from_millis(100);

                        let is_local = address.ip().is_loopback();
                        if !is_open() && !is_local {
                            warn!("Rejected non-local connection from {}", address);
                            continue;
                        }

                        let state = state.clone();
                        tokio::spawn(async move { handle_connection(stream, state).await; });
                    }
                    Err(e) => {
                        error!("Accept error: {}", e);
                        consecutive_errors += 1;
                        if consecutive_errors >= 20 {
                            error!("Too many accept errors, shutting down relay server task");
                            state.schedule_shutdown();
                            break;
                        }
                        tokio::time::sleep(backoff).await;
                        backoff = std::cmp::min(backoff * 2, MAX_BACKOFF);
                    }
                }
        }}
    }

    // 兜底清理
    state.clear_server().await;
    state.clear_clients();
    info!("Relay server shutdown");

    if let Some(state_cell) = SERVER_MANAGER.get() {
        let mut guard = state_cell.lock().await;
        guard.handle = None;
        guard.stop_tx = None;
    }
}

async fn handle_connection(stream: TcpStream, state: Arc<RelayState>) {
    if state.is_shutdown() {
        info!("Rejecting new connection: server shutting down");
        return;
    }

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    let (mut writer, mut reader) = ws_stream.split();
    let (tx, mut rx) = mpsc::channel::<Bytes>(512);

    // 发送任务
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = writer.send(Message::Binary(msg)).await {
                error!("WebSocket write failed: {}", e);
                drop(rx);
                break;
            }
        }
    });

    // 注册
    let session = match register_session(&state, tx, &mut reader).await {
        Ok(s) => s,
        Err(e) => {
            warn!("Registration failed: {}", e);
            return;
        }
    };

    // 转发任务
    match session.role {
        Role::Client => {
            client_relay(&state, &session, &mut reader).await;

            // 清理
            if let Some(id) = state.remove_by_id(session.session_id) {
                info!("Client disconnected with id: {}", format_uuid(&id));
            }
        }
        Role::Server => {
            server_relay(&state, &session, &mut reader).await;

            // 清理
            let server = state.get_server().await;
            if server
                .as_ref()
                .map(|s| Arc::ptr_eq(s, &session))
                .unwrap_or(false)
            {
                info!("Server disconnected");
                state.clear_server().await;
            }
        }
    }

    NEXT_SESSION_ID.deallocate(session.session_id);
    drop(session);
    if let Err(e) = send_task.await {
        info!("Send task panicked: {}", e);
    }
}

/// 0x01 = 注册为 Server
/// 0x02 = 注册为 Client + 后续字节是 client_id
async fn register_session(
    state: &Arc<RelayState>,
    tx: Tx,
    reader: &mut SplitStream<WebSocketStream<TcpStream>>,
) -> Result<Arc<Session>, &'static str> {
    let msg = timeout(Duration::from_secs(5), reader.next())
        .await
        .map_err(|_| "Registry Timeout")?;

    let payload = match msg {
        Some(Ok(Message::Binary(p))) => p,
        Some(Ok(Message::Close(_))) => return Err("Channel closed"),
        _ => return Err("Invalid register packet"),
    };

    if payload.is_empty() {
        return Err("Empty register packet");
    }

    match payload[0] {
        0x01 => {
            // 注册服务端
            if payload.len() < 33 {
                return Err("Invalid server register packet");
            }

            let server = state.get_server().await;
            if server.is_some() {
                send_relay_try(&tx, "ERR:Server already registered");
                return Err("Server already exists");
            }

            let provided_secret = &payload[1..33];

            // 密钥校验
            let state_cell = SERVER_MANAGER
                .get()
                .ok_or("Server manager not initialized")?;
            let guard = state_cell.lock().await;
            let expected_secret = guard
                .handle
                .as_ref()
                .map(|h| &h.secret)
                .ok_or("No server handle")?;

            if provided_secret != expected_secret {
                send_relay_try(&tx, "ERR:Invalid secret");
                return Err("Server secret mismatch");
            }

            let session_id = NEXT_SESSION_ID
                .allocate()
                .ok_or("No session id allocated")?;

            let session = Session::new(tx, Role::Server, None, session_id);
            state.register_server(session.clone()).await?;

            let registry_msg = format!("INFO:REGISTERED:{}", session.session_id);
            send_relay(&session.tx, &registry_msg, Duration::from_secs(2)).await;
            info!("Server registered");
            Ok(session)
        }
        0x02 => {
            // 注册 Client
            if payload.len() < 17 {
                send_relay_try(&tx, "ERR:Invalid register packet");
                return Err("Invalid client register packet");
            }

            let mut client_id = [0u8; 16];
            client_id.copy_from_slice(&payload[1..17]);
            let client_id = client_id;

            // UUID重复检查
            match state.client_uuids.entry(client_id) {
                Entry::Occupied(_) => {
                    send_relay_try(&tx, "ERR:Duplicate Player");
                    Err("Duplicate client UUID")
                }
                Entry::Vacant(v) => {
                    let session_id = NEXT_SESSION_ID
                        .allocate()
                        .ok_or("No session id allocated")?;

                    let session = Session::new(tx, Role::Client, Some(client_id), session_id);
                    v.insert(session.clone());
                    state.client_ids.insert(session_id, session.clone());

                    let registry_msg = format!("INFO:REGISTERED:{}", session.session_id);
                    send_relay(&session.tx, &registry_msg, Duration::from_secs(2)).await;

                    if let Some(server) = state.get_server().await {
                        let msg = format!(
                            "INFO:CLIENT_REGISTERED:{}:{}",
                            session.session_id,
                            format_uuid(&client_id)
                        );
                        send_relay(&server.tx, &msg, Duration::from_secs(2)).await;
                    }

                    info!("Client {} registered", format_uuid(&client_id));
                    Ok(session)
                }
            }
        }
        _ => Err("Not a register packet"),
    }
}

async fn client_relay(
    state: &Arc<RelayState>,
    session: &Arc<Session>,
    reader: &mut SplitStream<WebSocketStream<TcpStream>>,
) {
    while let Some(msg) = reader.next().await {
        if state.is_shutdown() {
            break;
        }
        match msg {
            Ok(Message::Binary(payload)) => {
                if payload.len() > MAX_PAYLOAD_LEN {
                    send_relay_try(&session.tx, "ERR:Payload too large");
                    break;
                }

                relay_client_message(&state, &session, payload).await;
            }
            Ok(Message::Close(_)) => {
                break;
            }
            Ok(_) => {}
            Err(e) => {
                error!(
                    "WebSocket read failed from client with id={}: {}",
                    session
                        .client_id
                        .map(|id| format_uuid(&id))
                        .unwrap_or_else(|| "<no-id>".to_string()),
                    e
                );
                break;
            }
        }
    }
}

async fn server_relay(
    state: &Arc<RelayState>,
    session: &Arc<Session>,
    reader: &mut SplitStream<WebSocketStream<TcpStream>>,
) {
    while let Some(msg) = reader.next().await {
        if state.is_shutdown() {
            break;
        }
        match msg {
            Ok(Message::Binary(payload)) => {
                if payload.len() > MAX_PAYLOAD_LEN {
                    send_relay_try(&session.tx, "ERR:Payload too large");
                    break;
                }

                relay_server_message(&state, &session, payload).await;
            }
            Ok(Message::Close(_)) => {
                break;
            }
            Ok(_) => {}
            Err(e) => {
                error!("WebSocket read failed from server  {}", e);
                break;
            }
        }
    }
}

/// 协议说明:
/// 0x00 = 中继服务器消息
/// 0x10 = Client -> Server
/// 0x11 = Server -> Client 广播 + 单个排除
/// 0x12 = Server -> Client 单发
async fn relay_client_message(state: &Arc<RelayState>, session: &Arc<Session>, payload: Bytes) {
    if payload.is_empty() {
        info!("Empty message received");
        return;
    }

    match payload[0] {
        0x10 => {
            // Client → Server
            let Some(server) = state.get_server().await else {
                return;
            };

            if payload.len() < 3 {
                warn!("InvalidPacket: Client message too short");
                return;
            }

            // 解析验证 sessionId
            let mut cursor = &payload[1..2];
            let session_id = cursor.get_u8();
            if session_id != session.session_id {
                warn!("Invalid sessionId from client, dropping connection");
                return;
            }

            if let Err(e) = server.tx.try_send(payload) {
                error!(
                    "Failed to forward message from Client {}: {}",
                    session
                        .client_id
                        .map(|id| format_uuid(&id))
                        .unwrap_or_else(|| "<no-id>".to_string()),
                    e
                );
            }
        }
        _ => {}
    }
}

async fn relay_server_message(state: &Arc<RelayState>, session: &Arc<Session>, payload: Bytes) {
    if payload.is_empty() {
        info!("Empty message received");
        return;
    }

    match payload[0] {
        0x11 => {
            // Server → 广播给所有 Client
            let to_remove: Vec<_> = state
                .client_ids
                .iter()
                .filter_map(|entry| {
                    if send_or_drop(&entry.value().tx, &payload) {
                        return Some(*entry.key());
                    }
                    None
                })
                .collect();

            for id in to_remove {
                if let Some(id) = state.remove_by_id(id) {
                    warn!("Dropping unresponsive client {}", format_uuid(&id));
                }
            }
        }
        0x12 => {
            // Server → 指定 Client SessionId
            if payload.len() < 3 {
                warn!("InvalidPacket: Unicast packet too short");
            }

            // SessionId 截断
            let target_id = &payload[2];

            if let Some(client) = state.client_ids.get(target_id) {
                let remaining = payload.slice(3..);
                let mut buf = BytesMut::with_capacity(2 + remaining.len());
                buf.put_u8(0x11);
                buf.put_u8(session.session_id);
                buf.extend_from_slice(&remaining);
                let forwarded = buf.freeze();

                if client.tx.send(forwarded).await.is_err() {
                    state.remove_by_id(client.session_id);
                }
            };
        }
        0x13 => {
            // Server → 指定 Client UUID
            if payload.len() < 18 {
                warn!("InvalidPacket: Unicast packet too short");
            }

            // UUID截断
            let mut target_client_id = [0u8; 16];
            target_client_id.copy_from_slice(&payload[2..18]);
            let target_client_id = target_client_id;
            if is_nil_uuid(&target_client_id) {
                return;
            }

            if let Some(client) = state.client_uuids.get(&target_client_id) {
                let remaining = payload.slice(18..);
                let mut buf = BytesMut::with_capacity(2 + remaining.len());
                buf.put_u8(0x11);
                buf.put_u8(session.session_id);
                buf.extend_from_slice(&remaining);
                let forwarded = buf.freeze();

                if client.tx.send(forwarded).await.is_err() {
                    state.remove_by_id(client.session_id);
                }
            };
        }
        0x14 => {
            // Server → 广播给未被排除的 Client
            if payload.len() < 3 {
                warn!("InvalidPacket: BroadcastExcluding too short");
                return;
            }

            let mut cursor = &payload[2..];

            let (count, remaining) = match read_var_uint(cursor) {
                Ok(v) => v,
                Err(e) => {
                    info!("Parse varUint error: {}", e);
                    return;
                }
            };

            if count > MAX_EXCLUDES {
                send_relay_try(&session.tx, "ERR:Exclude list too large");
                warn!("InvalidPacket: Exclude list too large");
                return;
            }

            cursor = remaining;

            // 解析UUID
            let (excludes, rest_payload) = match parse_excludes(cursor, count as usize) {
                Ok(v) => v,
                Err(e) => {
                    info!("Parse exclude uuid error: {}", e);
                    return;
                }
            };

            let mut buf = BytesMut::with_capacity(2 + rest_payload.len());
            buf.put_u8(0x11);
            buf.put_u8(session.session_id);
            buf.extend_from_slice(rest_payload);
            let forwarded = buf.freeze();

            let to_remove: Vec<_> = state
                .client_ids
                .iter()
                .filter_map(|entry| {
                    let id = *entry.key();
                    if excludes.iter().any(|ex| ex == &id) {
                        return None;
                    }

                    let session = entry.value();
                    if send_or_drop(&session.tx, &forwarded) {
                        return Some(id);
                    }
                    None
                })
                .collect();

            for id in to_remove {
                if let Some(id) = state.remove_by_id(id) {
                    warn!("Dropping unresponsive client {}", format_uuid(&id));
                }
            }
        }
        _ => {}
    }
}

fn build_relay_msg(msg: &str) -> Bytes {
    let mut buf = BytesMut::new();
    buf.put_u8(0x00);

    let bytes = msg.as_bytes();
    buf.put_u16_le(bytes.len() as u16);
    buf.put_slice(bytes);
    buf.freeze()
}

/// 中继服务器发送
async fn send_relay(tx: &Tx, msg: &str, timeout: Duration) {
    let payload = build_relay_msg(msg);

    match tx.send_timeout(payload, timeout).await {
        Ok(()) => {}
        Err(_) => {}
    }
}

fn send_relay_try(tx: &Tx, msg: &str) {
    let payload = build_relay_msg(msg);
    let _ = tx.try_send(payload);
}

/// 广播
fn send_or_drop(tx: &Tx, payload: &Bytes) -> bool {
    match tx.try_send(payload.clone()) {
        Ok(()) => false,
        Err(_) => true,
    }
}
