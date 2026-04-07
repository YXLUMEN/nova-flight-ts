use crate::network::cmd::is_open;
use crate::network::protocol::*;
use crate::network::session::{Session, SessionContext, NEXT_SESSION_ID};
use crate::network::states::{RelayState, Role, ServerManager, Tx};
use crate::network::util::{format_uuid, get_time, is_nil_uuid, parse_session_id, read_var_uint};
use bytes::{Buf, BufMut, BytesMut};
use dashmap::Entry;
use futures_util::stream::SplitStream;
use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, oneshot, Mutex, OnceCell};
use tokio::time::{timeout, Duration};
use tokio_tungstenite::tungstenite::{Bytes, Error, Message};
use tokio_tungstenite::{accept_async, WebSocketStream};

pub static SERVER_MANAGER: OnceCell<Mutex<ServerManager>> = OnceCell::const_new();
pub static OPEN_FLAG: OnceCell<AtomicBool> = OnceCell::const_new();

const MAX_PAYLOAD_LEN: usize = 6144; // 6 KB upper bound for a single frame
const MAX_EXCLUDES: u32 = 16; // exclude uuid count
const MAX_BACKOFF: Duration = Duration::from_secs(5);
const MAX_CONNECTIONS: usize = 64; // u8 session id space upper bound with margin

pub async fn run_ws_server(
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

                        if state.size() >= MAX_CONNECTIONS {
                            warn!("Connection limit reached ({}), rejecting {}", MAX_CONNECTIONS, address);
                            drop(stream);
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

    match stream.peer_addr() {
        Ok(a) => {
            info!("New connection received {}", a);
        }
        Err(e) => {
            error!("Failed to get peer address: {}", e);
            return;
        }
    };

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    // tcp + 消息管道
    let (mut writer, mut reader) = ws_stream.split();
    let (tx, mut rx) = mpsc::channel::<Bytes>(512);

    // 向此连接发送
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = writer.send(Message::Binary(msg)).await {
                error!("WebSocket write failed: {}", e);
                drop(rx);
                let _ = writer.close().await;
                break;
            }
        }
    });

    info!("Start to registry {}", get_time());

    let ctx = match attach_session(&state, tx, &mut reader).await {
        Ok(s) => s,
        Err(e) => {
            warn!("Registration failed: {}", e);
            return;
        }
    };

    // 向对端发送
    let session = ctx.session;
    match session.role {
        Role::Client => {
            if let Some(allow_rx) = ctx.allow {
                info!("Client {} waiting release", session.session_id);
                let allow = tokio::select! {
                    _ = allow_rx => true,
                    _ = tokio::time::sleep(Duration::from_secs(4)) => false,
                };

                info!("Client {} released {}", session.session_id, allow);
                if allow {
                    if let Some(close_rx) = ctx.close {
                        client_relay(&state, &session, &mut reader, close_rx).await;
                    }
                }
            }

            // 清理
            if let Some(id) = state.remove_by_id(session.session_id) {
                info!("Client disconnected with id: {}", format_uuid(&id));
                if let Some(server) = state.get_server().await {
                    let packet = Detached {
                        session_id: session.session_id,
                    };
                    send_packet(&server.tx, packet, Duration::from_secs(2)).await;
                }
            }
        }
        Role::Server => {
            server_relay(&state, &session, &mut reader).await;

            // 清理
            if state
                .get_server()
                .await
                .as_ref()
                .map(|s| Arc::ptr_eq(s, &session))
                .unwrap_or(false)
            {
                info!("Server disconnected");
                state.iter_ids().for_each(|client| {
                    client.close(&state);
                });
                state.clear_server().await;
            }
        }
    }

    info!("Connection closed {}", session.session_id);
    info!("Left {} client conn", state.size());

    NEXT_SESSION_ID.deallocate(session.session_id).await;
    drop(session);
    if let Err(e) = send_task.await {
        info!("Send task panicked: {}", e);
    }
}

/// 0x01 = 注册为 Server
/// 0x02 = 注册为 Client + 后续字节是 client_id
async fn attach_session(
    state: &Arc<RelayState>,
    tx: Tx,
    reader: &mut SplitStream<WebSocketStream<TcpStream>>,
) -> Result<SessionContext, &'static str> {
    let msg = timeout(Duration::from_secs(5), reader.next())
        .await
        .map_err(|_| "Registry Timeout")?;

    let incoming = match msg {
        Some(Ok(Message::Binary(p))) => p,
        Some(Ok(Message::Close(_))) => return Err("Channel closed"),
        _ => return Err("Invalid register packet"),
    };

    if incoming.is_empty() {
        return Err("Empty register packet");
    }

    match incoming[0] {
        0x01 => {
            // 注册服务端
            if incoming.len() < 33 {
                return Err("Invalid server register packet");
            }

            let server = state.get_server().await;
            if server.is_some() {
                send_message(&tx, "ERR:Server already registered");
                return Err("Server already exists");
            }

            let provided_secret = &incoming[1..33];

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

            if !constant_time_eq(provided_secret, expected_secret.as_ref()) {
                send_message(&tx, "ERR:Invalid secret");
                return Err("Server secret mismatch");
            }

            let session_id = NEXT_SESSION_ID
                .allocate()
                .await
                .ok_or("No session id allocated")?;

            let session = Session::new_server(tx, session_id);
            state.register_server(session.clone()).await?;

            let packet = Attached {
                session_id: session.session_id,
            };
            send_packet(&session.tx, packet, Duration::from_secs(2)).await;
            info!("Server registered at {}", get_time());
            Ok(SessionContext {
                session,
                allow: None,
                close: None,
            })
        }
        0x02 => {
            // 注册 Client
            if incoming.len() < 17 {
                send_message(&tx, "ERR:Invalid register packet");
                return Err("Invalid client register packet");
            }

            let mut uuid = [0u8; 16];
            uuid.copy_from_slice(&incoming[1..17]);
            let uuid = uuid;

            // UUID重复检查
            match state.register_client(uuid) {
                Entry::Occupied(_) => {
                    send_message(&tx, "ERR:Duplicate Player");
                    Err("Duplicate client UUID")
                }
                Entry::Vacant(v) => {
                    let session_id = NEXT_SESSION_ID
                        .allocate()
                        .await
                        .ok_or("No session id allocated")?;

                    let (permit_tx, permit_rx) = oneshot::channel::<()>();
                    let (c_tx, c_rx) = oneshot::channel::<()>();
                    let session = Session::new_client(tx, session_id, uuid);

                    v.insert(session.clone());
                    state.complete_client(session_id, session.clone(), permit_tx, c_tx);

                    let packet = Attached {
                        session_id: session.session_id,
                    };
                    send_packet(&session.tx, packet, Duration::from_secs(2)).await;

                    // 向服务端发送注册消息
                    if let Some(server) = state.get_server().await {
                        let packet = ClientAttached {
                            session_id: session.session_id,
                            uuid,
                        };
                        send_packet(&server.tx, packet, Duration::from_secs(2)).await;
                    }

                    info!("Client {} registered at {}", format_uuid(&uuid), get_time());
                    Ok(SessionContext {
                        session,
                        allow: Some(permit_rx),
                        close: Some(c_rx),
                    })
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
    mut close_rx: oneshot::Receiver<()>,
) -> () {
    loop {
        tokio::select! {
            _ = & mut close_rx => break,
            msg = reader.next() => {
                let Some(msg) = msg else {
                    return;
                };
                if !on_recv_client(state,session, msg).await {
                    break;
                }
            }
        }
    }
}

async fn on_recv_client(
    state: &Arc<RelayState>,
    session: &Arc<Session>,
    msg: Result<Message, Error>,
) -> bool {
    match msg {
        Ok(Message::Binary(payload)) => {
            if payload.len() > MAX_PAYLOAD_LEN {
                send_message(&session.tx, "ERR:Payload too large");
                return false;
            }

            relay_client_message(&state, &session, payload).await
        }
        Ok(Message::Close(_)) => false,
        Ok(_) => true,
        Err(e) => {
            error!(
                "WebSocket read failed from client with id={}: {}",
                session
                    .uuid
                    .map(|id| format_uuid(&id))
                    .unwrap_or_else(|| "<no-id>".to_string()),
                e
            );
            false
        }
    }
}

async fn server_relay(
    state: &Arc<RelayState>,
    session: &Arc<Session>,
    reader: &mut SplitStream<WebSocketStream<TcpStream>>,
) {
    while let Some(msg) = reader.next().await {
        match msg {
            Ok(Message::Binary(payload)) => {
                if payload.len() > MAX_PAYLOAD_LEN {
                    send_message(&session.tx, "ERR:Payload too large");
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
/// 0xff = Server -> Relay 操作
async fn relay_client_message(
    state: &Arc<RelayState>,
    session: &Arc<Session>,
    payload: Bytes,
) -> bool {
    if payload.is_empty() {
        info!("Empty message received");
        return true;
    }

    match payload[0] {
        0x10 => {
            // Client → Server
            let Some(server) = state.get_server().await else {
                return true;
            };

            if payload.len() < 3 {
                warn!("InvalidPacket: Client message too short");
                return true;
            }

            // 解析验证 sessionId
            let mut cursor = &payload[1..2];
            let session_id = cursor.get_u8();
            if session_id != session.session_id {
                warn!("Invalid sessionId from client, dropping connection");
                return false;
            }

            let Err(e) = server.tx.try_send(payload) else {
                return true;
            };
            error!(
                "Failed to forward message from Client {}: {}",
                session
                    .uuid
                    .map(|id| format_uuid(&id))
                    .unwrap_or_else(|| "<no-id>".to_string()),
                e
            );
            false
        }
        _ => true,
    }
}

async fn relay_server_message(state: &Arc<RelayState>, session: &Arc<Session>, payload: Bytes) {
    if payload.is_empty() {
        info!("Empty message received");
        return;
    }

    match payload[0] {
        0x11 => {
            // [Header][Id][Data]
            // Server → 广播给所有 Client
            state.iter_ids().for_each(|client| {
                if !send_or_drop(&client.tx, &payload) {
                    return;
                }
                client.close(state);
                if let Some(uuid) = client.uuid {
                    warn!(
                        "[Broadcast] Dropping unresponsive client {}",
                        format_uuid(&uuid)
                    );
                }
            });
        }
        0x12 => {
            // [Header][TargetId][Data]
            // Server → 指定 Client SessionId
            if payload.len() < 2 {
                warn!("InvalidPacket: Unicast packet too short");
                return;
            }

            // SessionId
            let target_id = &payload[1];
            let Some(client) = state.get_by_id(target_id) else {
                return;
            };
            if client.tx.send(payload).await.is_err() {
                client.close(state);
            }
        }
        0x13 => {
            // [Header][Id][TargetUuid][Data]
            // Server → 指定 Client UUID
            if payload.len() < 18 {
                warn!("InvalidPacket: Unicast packet too short");
                return;
            }

            // UUID截断
            let mut target_client_id = [0u8; 16];
            target_client_id.copy_from_slice(&payload[2..18]);
            let target_client_id = target_client_id;

            if is_nil_uuid(&target_client_id) {
                return;
            }

            let Some(client) = state.get_by_uuid(&target_client_id) else {
                return;
            };

            let remaining = payload.slice(18..);

            let mut buf = BytesMut::with_capacity(2 + remaining.len());
            buf.put_u8(0x11);
            buf.put_u8(session.session_id);
            buf.put_slice(&remaining);
            let forwarded = buf.freeze();

            if client.tx.send(forwarded).await.is_err() {
                client.close(state);
            }
        }
        0x14 => {
            // [Header][Id][TargetIds][Data]
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
                send_message(&session.tx, "ERR:Exclude list too large");
                warn!("InvalidPacket: Exclude list too large");
                return;
            }

            cursor = remaining;

            // 解析 id
            let (excludes, rest_payload) = match parse_session_id(cursor, count as usize) {
                Ok(v) => v,
                Err(e) => {
                    info!("Parse exclude id error: {}", e);
                    return;
                }
            };

            let mut buf = BytesMut::with_capacity(2 + rest_payload.len());
            buf.put_u8(0x11);
            buf.put_u8(session.session_id);
            buf.put_slice(rest_payload);
            let forwarded = buf.freeze();

            state.iter_ids().for_each(|client| {
                let id = *client.key();
                if excludes.iter().any(|ex| ex == &id) {
                    return;
                }
                if !send_or_drop(&client.tx, &forwarded) {
                    return;
                }
                client.close(state);
                if let Some(uuid) = client.uuid {
                    warn!(
                        "[Excludes] Dropping unresponsive client {}",
                        format_uuid(&uuid)
                    );
                }
            });
        }
        0xff => relay_actions(state, session, payload).await,
        _ => {}
    }
}

async fn relay_actions(state: &Arc<RelayState>, session: &Arc<Session>, payload: Bytes) -> () {
    // 协议格式: [Header 0xff][Type 1][Data n]
    // Action 类型表:
    //   0x00 = Kick         [session_id 1]         踢出指定客户端
    //   0x01 = Permit       [session_id 1]         放行客户端流量
    //   0x02 = QueryClients (no data)              查询当前在线客户端列表
    if payload.len() < 2 {
        action_fail(&session.tx, "Invalid action packet").await;
        return;
    }

    let data = &payload[2..];
    match payload[1] {
        0x00 => {
            if data.len() < 1 {
                action_fail(&session.tx, "[Kick] Session id cannot be empty").await;
                return;
            }

            let session_id = &data[0];
            if let Some(client) = state.get_by_id(session_id) {
                send_message(&client.tx, "Kicked");
                client.close(state);
            }
        }
        0x01 => {
            if data.len() < 1 {
                action_fail(&session.tx, "[Permit] Session id cannot be empty").await;
                return;
            }
            state.permit(&data[0]);
        }
        0x02 => {
            // QueryClients: 查询当前所有在线客户端列表
            // 回包格式: [0x00][0x04][count u8]([session_id u8][uuid 16B])*
            let clients = state.collect_client_list();
            let result = QueryClientsResult { clients };
            send_packet(&session.tx, result, Duration::from_secs(2)).await;
        }
        _ => {
            warn!("Invalid action type: 0x{:02x}", payload[1]);
            action_fail(&session.tx, "Unknown action type").await;
        }
    };
}

/// 中继服务器发送
async fn send_packet<T: Payload>(tx: &Tx, payload: T, timeout: Duration) -> () {
    let buf = payload.to_bytes();
    match tx.send_timeout(buf, timeout).await {
        Ok(()) => {}
        Err(e) => {
            error!("Failed to send relay: {}", e);
        }
    }
}

fn try_send_packet<T: Payload>(tx: &Tx, payload: T) -> () {
    let buf = payload.to_bytes();
    let _ = tx.try_send(buf);
}

/// 区别于 send_message.
/// 此方法只能向服务端发送
async fn action_fail(tx: &Tx, reason: &str) -> () {
    let packet = RelayMessage {
        message: reason.to_string(),
    };
    send_packet(tx, packet, Duration::from_secs(2)).await;
}

fn send_message(tx: &Tx, reason: &str) -> () {
    let packet = RelayMessage {
        message: reason.to_string(),
    };
    try_send_packet(tx, packet);
}

/// 广播
fn send_or_drop(tx: &Tx, payload: &Bytes) -> bool {
    tx.try_send(payload.clone()).is_err()
}

/// 常量时间字节比较,防止时序侧信道攻击
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter()
        .zip(b.iter())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}
