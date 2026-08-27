use crate::network::client::{client_relay, ClientContext};
use crate::network::cmd::is_open;
use crate::network::infrastructure::header::*;
use crate::network::infrastructure::net::{send_message, send_timeout};
use crate::network::infrastructure::protocol::*;
use crate::network::infrastructure::session::{Session, SessionContext, NEXT_SESSION_ID};
use crate::network::infrastructure::states::{RelayState, Role, ServerManager, Tx};
use crate::network::infrastructure::util::{constant_time_eq, format_uuid, now_ms};
use crate::network::server::{server_relay, ServerContext};
use dashmap::Entry;
use futures_util::stream::SplitStream;
use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
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
    let (tx, mut rx) = mpsc::channel::<Bytes>(256);

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

    info!("Start to registry {}", now_ms());

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
            if let Some((allow_rx, mut close_rx)) = ctx.allow.zip(ctx.close) {
                info!("Client {} waiting release", session.session_id);
                let is_allow = tokio::select! {
                    _ = allow_rx => true,
                    _ = &mut close_rx => false,
                    _ = tokio::time::sleep(Duration::from_secs(4)) => false,
                };

                info!("Client {} released {}", session.session_id, is_allow);
                if is_allow {
                    state.active_client(session.session_id, session.clone());

                    let packet = Attached {
                        session_id: session.session_id,
                    };
                    send_timeout(&session.tx, packet, Duration::from_secs(2)).await;
                    client_relay(ClientContext {
                        state: &state,
                        session: &session,
                        reader,
                        close_rx,
                    })
                    .await;
                }
            }

            // 清理
            if let Some(id) = state.remove_by_id(session.session_id) {
                info!("Client disconnected with id: {}", format_uuid(&id));
                if let Some(server) = state.get_server().await {
                    let packet = Detached {
                        session_id: session.session_id,
                    };
                    send_timeout(&server.tx, packet, Duration::from_secs(2)).await;
                }
            }
        }
        Role::Server => {
            server_relay(ServerContext {
                state: &state,
                session: &session,
                reader,
            })
            .await;

            // 清理
            if state
                .get_server()
                .await
                .as_ref()
                .map(|s| Arc::ptr_eq(s, &session))
                .unwrap_or(false)
            {
                info!("Server disconnected");
                let ids: Vec<u8> = state.iter_clients().map(|e| *e.key()).collect();
                for id in ids {
                    state.close(&id);
                }
                state.clear_server().await;
            }
        }
    }

    info!(
        "\"{:?}\" side connection closed with SID {}",
        session.role, session.session_id
    );
    info!("Left {} connections", state.size());

    NEXT_SESSION_ID.deallocate(session.session_id).await;
    drop(session);
    if let Err(e) = send_task.await {
        info!("Send task panicked: {}", e);
    }
}

/// 0x01 = 注册为 Server
/// 0x02 = 注册为 Client + 后续字节是 client_id
async fn attach_session(
    state: &RelayState,
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
        REG_SERVER => {
            // 注册服务端
            if incoming.len() != 33 {
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
            if let Err(e) = state.register_server(session.clone()).await {
                NEXT_SESSION_ID.deallocate(session_id).await;
                return Err(e);
            }

            let packet = Attached {
                session_id: session.session_id,
            };
            send_timeout(&session.tx, packet, Duration::from_secs(2)).await;
            info!("Server registered at {}", now_ms());
            Ok(SessionContext {
                session,
                allow: None,
                close: None,
            })
        }
        REG_CLIENT => {
            // 注册 Client
            if incoming.len() != 17 {
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

                    v.insert(session_id);
                    state.insert_client_entry(session_id, session.clone(), permit_tx, c_tx);

                    // 向服务端发送注册消息
                    if let Some(server) = state.get_server().await {
                        let packet = ClientAttached {
                            session_id: session.session_id,
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
        _ => Err("Not a register packet"),
    }
}
