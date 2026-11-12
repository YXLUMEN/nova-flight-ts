use crate::network::client::{client_relay, ClientContext};
use crate::network::cmd::is_open;
use crate::network::infrastructure::header::*;
use crate::network::infrastructure::net::{send_code, send_timeout};
use crate::network::infrastructure::protocol::*;
use crate::network::infrastructure::session::{Session, SessionContext, NEXT_SESSION_ID};
use crate::network::infrastructure::states::{RelayState, Role, ServerManager, Tx};
use crate::network::infrastructure::util::{constant_time_eq, format_uuid, is_nil_uuid, now_ms};
use crate::network::server::{server_relay, ServerContext};
use dashmap::Entry;
use futures_util::stream::SplitStream;
use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use std::net::SocketAddr;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, oneshot, Mutex, OnceCell};
use tokio::time::{timeout, Duration};
use tokio_tungstenite::tungstenite::{Bytes, Message};
use tokio_tungstenite::{accept_async, WebSocketStream};

pub static SERVER_MANAGER: OnceCell<Mutex<ServerManager>> = OnceCell::const_new();
pub static OPEN_FLAG: OnceCell<AtomicBool> = OnceCell::const_new_with(AtomicBool::new(false));

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

                        let is_banned = state.is_banned(&address.ip()).await;
                        if is_banned {
                            info!("A banned IP attempt to connect {}", address);
                            continue;
                        }

                        if state.size() >= MAX_CONNECTIONS {
                            warn!("Connection limit reached ({}), rejecting {}", MAX_CONNECTIONS, address);
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
    state.unban_all().await;
    drop(state);
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

    let addr = match stream.peer_addr() {
        Ok(a) => {
            info!("New connection received {}", a);
            a
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

    // ws + 消息管道
    let (mut writer, mut reader) = ws_stream.split();
    let (tx, mut rx) = mpsc::channel::<Bytes>(256);

    // 向此连接发送
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let Err(e) = writer.send(Message::Binary(msg)).await else {
                continue;
            };
            error!("ws write failed. cause by\n {}", e);
            break;
        }
        let _ = writer.close().await;
        drop(rx);
    });

    info!("Start to registry at \"{}\"", now_ms());

    let ctx = match attach_session(&state, tx, &mut reader, &addr).await {
        Ok(s) => s,
        Err(e) => {
            warn!("Registration failed: {}", e);
            return;
        }
    };

    // 向对端发送
    let session = ctx.session.clone();
    match session.role {
        Role::Client => play_client(&state, ctx, reader).await,
        Role::Server => play_server(&state, &session, reader).await,
    }

    info!(
        "\"{:?}\" side connection closed with sid {}",
        session.role, session.session_id
    );
    info!("Left {} connections", state.size());

    NEXT_SESSION_ID.deallocate(session.session_id).await;
    drop(session);
    if let Err(e) = send_task.await {
        info!("Send task panicked: {}", e);
    }
}

async fn attach_session(
    state: &RelayState,
    tx: Tx,
    reader: &mut SplitStream<WebSocketStream<TcpStream>>,
    addr: &SocketAddr,
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
        REG_SERVER => attach_server(state, tx, incoming).await,
        REG_CLIENT => attach_client(state, tx, addr, incoming).await,
        _ => Err("Not a register packet"),
    }
}

async fn attach_server(
    state: &RelayState,
    tx: Tx,
    incoming: Bytes,
) -> Result<SessionContext, &'static str> {
    // 注册服务端
    if incoming.len() != 33 {
        return Err("Invalid server register packet");
    }

    let server = state.get_server().await;
    if server.is_some() {
        send_code(&tx, DUPLICATE_SERVER);
        return Err("Server already exists");
    }

    let provided_secret = &incoming[1..33];

    // 密钥校验
    let state_cell = SERVER_MANAGER
        .get()
        .ok_or("Server manager not initialized")?;
    let mut guard = state_cell.lock().await;
    let expected_secret = guard
        .handle
        .as_ref()
        .map(|h| &h.secret)
        .ok_or("No server handle")?;

    if !constant_time_eq(provided_secret, expected_secret) {
        // 密钥错误同样返回"服务端已存在"
        send_code(&tx, DUPLICATE_SERVER);
        return Err("Server secret mismatch");
    }

    let session_id = NEXT_SESSION_ID
        .allocate()
        .await
        .ok_or("No session id allocated")?;

    let session = Session::new_server(tx, session_id);
    if let Err(e) = state.register_server(session.clone()).await {
        NEXT_SESSION_ID.deallocate(session_id).await;
        return Err(e);
    }

    // 销毁密钥
    let handle = guard.handle.as_mut().ok_or("No server handle")?;
    handle.secret.fill(0);

    let packet = Attached {
        session_id: session.session_id,
    };
    send_timeout(&session.tx, packet, Duration::from_secs(2)).await;
    info!("Server registered at {} with id {}", now_ms(), session_id);
    Ok(SessionContext {
        session,
        allow: None,
        close: None,
    })
}

async fn attach_client(
    state: &RelayState,
    tx: Tx,
    addr: &SocketAddr,
    incoming: Bytes,
) -> Result<SessionContext, &'static str> {
    // 注册 Client
    if incoming.len() != 17 {
        send_code(&tx, INVALID_REGISTER_PACKET);
        return Err("Invalid client register packet");
    }

    let mut uuid = [0u8; 16];
    uuid.copy_from_slice(&incoming[1..17]);
    let uuid = uuid;

    if is_nil_uuid(&uuid) {
        send_code(&tx, INVALID_REGISTER_PACKET);
        return Err("Client uuid is nil");
    }

    // UUID重复检查
    match state.register_client(uuid) {
        Entry::Occupied(_) => {
            send_code(&tx, DUPLICATE_PLAYER);
            Err("Duplicate client UUID")
        }
        Entry::Vacant(v) => {
            let session_id = NEXT_SESSION_ID
                .allocate()
                .await
                .ok_or("No session id allocated")?;

            v.insert(session_id);

            let (permit_tx, permit_rx) = oneshot::channel::<()>();
            let (c_tx, c_rx) = oneshot::channel::<()>();
            let session = Session::new_client(tx, session_id, uuid);

            state.insert_client_entry(session_id, session.clone(), permit_tx, c_tx);

            // 向服务端发送注册消息
            if let Some(server) = state.get_server().await {
                let packet = ClientAttached {
                    session_id: session.session_id,
                    addr: &addr.to_string(),
                };
                send_timeout(&server.tx, packet, Duration::from_secs(2)).await;
            }

            info!("Client {} registered at {}", format_uuid(&uuid), now_ms());
            Ok(SessionContext {
                session,
                allow: Some(permit_rx),
                close: Some(c_rx),
            })
        }
    }
}

async fn play_server(
    state: &RelayState,
    session: &Arc<Session>,
    reader: SplitStream<WebSocketStream<TcpStream>>,
) {
    server_relay(ServerContext {
        state,
        session,
        reader,
    })
    .await;

    // 清理
    if state
        .get_server()
        .await
        .as_ref()
        .map(|s| Arc::ptr_eq(s, session))
        .unwrap_or(false)
    {
        info!("Server disconnected");
        for client in state.iter_clients() {
            state.close(client.key());
        }
        state.clear_server().await;
    }
}

async fn play_client(
    state: &RelayState,
    ctx: SessionContext,
    reader: SplitStream<WebSocketStream<TcpStream>>,
) {
    let session = &ctx.session;
    let session_id = session.session_id;

    if let Some((allow_rx, mut close_rx)) = ctx.allow.zip(ctx.close) {
        info!("Client {} waiting release", session_id);
        let is_allow = tokio::select! {
            _ = allow_rx => true,
            _ = &mut close_rx => false,
            _ = tokio::time::sleep(Duration::from_secs(4)) => false,
        };

        info!("Client {} released {}", session_id, is_allow);
        if is_allow {
            state.active_client(session_id, session.clone());

            let packet = Attached { session_id };
            send_timeout(&session.tx, packet, Duration::from_secs(2)).await;

            client_relay(ClientContext {
                state,
                session,
                reader,
                close_rx,
            })
            .await;
        }
    }

    // 清理
    let Some(id) = state.remove_by_id(session_id) else {
        info!("Client disconnected with sid: {}", session_id);
        return;
    };

    info!("Client disconnected with uuid: {}", format_uuid(&id));
    if let Some(server) = state.get_server().await {
        let packet = Detached { session_id };
        send_timeout(&server.tx, packet, Duration::from_secs(2)).await;
    }
}
