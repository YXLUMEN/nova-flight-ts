use crate::network::client::{ClientContext, client_relay};
use crate::network::cmd::is_open;
use crate::network::infrastructure::errors::RegisterError;
use crate::network::infrastructure::header::*;
use crate::network::infrastructure::net::{send_code, send_timeout};
use crate::network::infrastructure::protocol::*;
use crate::network::infrastructure::relay::{PendingClient, RelayManager, RelayState};
use crate::network::infrastructure::session::{PendingSession, RoleContext, Session, Tx};
use crate::network::infrastructure::session_alloc::SessionAllocator;
use crate::network::infrastructure::util::{constant_time_eq, format_uuid, is_nil_uuid};
use crate::network::server::{ServerContext, server_relay};
use dashmap::Entry;
use futures_util::stream::SplitStream;
use futures_util::{SinkExt, StreamExt};
use log::{debug, error, info, log, warn};
use std::net::{SocketAddr, SocketAddrV4};
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, LazyLock};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{Mutex, OnceCell, mpsc, oneshot};
use tokio::time::{Duration, timeout};
use tokio_tungstenite::tungstenite::{Bytes, Message};
use tokio_tungstenite::{WebSocketStream, accept_async};

pub(crate) static SERVER_MANAGER: OnceCell<Mutex<RelayManager>> = OnceCell::const_new();
pub(crate) static OPEN_FLAG: OnceCell<AtomicBool> =
    OnceCell::const_new_with(AtomicBool::new(false));
static NEXT_SESSION_ID: LazyLock<SessionAllocator> = LazyLock::new(|| SessionAllocator::new());

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

                        let SocketAddr::V4(addrv4) = address else {
                            debug!("Only support Ipv4 {}", address);
                            continue;
                        };

                        let is_local = address.ip().is_loopback();
                        if !is_open() && !is_local {
                            debug!("Rejected non-local connection from {}", address);
                            continue;
                        }

                        let is_banned = state.is_banned(&address.ip()).await;
                        if is_banned {
                            debug!("A banned IP attempt to connect {}", address);
                            continue;
                        }

                        // the max value sid can be, u8::MAX - 1
                        if state.pending_len() >= MAX_CONNECTION as usize {
                            debug!("Session limit reached ({}), rejecting {}", MAX_CONNECTION, address);
                            continue;
                        }

                        // activate connection
                        if state.active_len() >= MAX_SESSION as usize {
                            debug!("Connection limit reached ({}), rejecting {}", MAX_SESSION, address);
                            continue;
                        }

                        let state = state.clone();
                        tokio::spawn(async move { handle_connection(stream, addrv4, state).await; });
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

    if let Err(_) = timeout(Duration::from_secs(8), async {
        state.clear_server().await;
        state.clear_clients();
        state.unban_all().await;
    })
    .await
    {
        error!("Waiting cleaning timeout");
    };

    drop(state);
    info!("Relay server shutdown");

    if let Some(state_cell) = SERVER_MANAGER.get() {
        let mut guard = state_cell.lock().await;
        guard.handle = None;
        guard.stop_tx = None;
    }
}

async fn handle_connection(stream: TcpStream, address: SocketAddrV4, state: Arc<RelayState>) {
    if state.is_shutdown() {
        debug!("Rejecting new connection: server shutting down");
        return;
    }

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            debug!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    // ws + mpsc
    let (mut writer, mut reader) = ws_stream.split();
    let (tx, mut rx) = mpsc::channel::<Bytes>(256);

    // send to this connection
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let Err(e) = writer.send(Message::Binary(msg)).await else {
                continue;
            };
            error!("ws write failed. cause by\n {}", e);
            break;
        }
        // shut ws
        let _ = timeout(Duration::from_secs(2), writer.close()).await;
        drop(rx);
    });

    debug!("Start to registry for \"{}\"", &address);

    let role = match attach_session(&state, tx, &mut reader, &address).await {
        Ok(s) => s,
        Err(e) => {
            log!(e.level(), "Registration failed from {}: {}", &address, e);
            return;
        }
    };

    // send to opposite
    // return 0 mean alloc fail, deallocate noop
    let sid_option = match role {
        RoleContext::Server(session) => play_server(&state, &session, reader).await,
        RoleContext::Client(session) => play_client(&state, session, &address, reader).await,
    };

    debug!(
        "left \"{}\" active, pending \"{}\"",
        state.active_len(),
        state.pending_len()
    );

    if let Some(sid) = sid_option {
        NEXT_SESSION_ID.deallocate(sid).await;
    }
    if let Err(e) = send_task.await {
        info!("Send task panicked: {}", e);
    }
}

async fn attach_session(
    state: &RelayState,
    tx: Tx,
    reader: &mut SplitStream<WebSocketStream<TcpStream>>,
    addr: &SocketAddrV4,
) -> Result<RoleContext, RegisterError> {
    // wait first message
    let msg = timeout(Duration::from_secs(5), reader.next())
        .await
        .map_err(|_| RegisterError::Timeout)?;

    let incoming = match msg {
        Some(Ok(Message::Binary(p))) => p,
        Some(Ok(Message::Close(_))) => return Err(RegisterError::ChannelClosed),
        _ => return Err(RegisterError::InvalidPacket),
    };

    if incoming.is_empty() {
        return Err(RegisterError::EmptyPacket);
    }

    match incoming[0] {
        REG_SERVER => attach_server(state, tx, incoming).await,
        REG_CLIENT => attach_client(state, tx, addr, incoming).await,
        _ => Err(RegisterError::NotRegisterPacket),
    }
}

async fn attach_server(
    state: &RelayState,
    tx: Tx,
    incoming: Bytes,
) -> Result<RoleContext, RegisterError> {
    if incoming.len() != 33 {
        return Err(RegisterError::InvalidPacket);
    }

    let server = state.get_server().await;
    if server.is_some() {
        send_code(&tx, DUPLICATE_SERVER);
        return Err(RegisterError::DuplicateServer);
    }

    let provided_secret = &incoming[1..33];

    // check secret
    let state_cell = SERVER_MANAGER
        .get()
        .ok_or(RegisterError::Internal("Server manager not initialized"))?;
    let mut guard = state_cell.lock().await;
    let expected_secret = guard
        .handle
        .as_ref()
        .map(|h| &h.secret)
        .ok_or(RegisterError::Internal("No server handle"))?;

    if !constant_time_eq(provided_secret, expected_secret) {
        // also feedback duplicate server
        send_code(&tx, DUPLICATE_SERVER);
        return Err(RegisterError::SecretMismatch);
    }

    let session_id = NEXT_SESSION_ID
        .allocate()
        .await
        .ok_or(RegisterError::Internal("No session id allocated"))?;

    let session = Session::new(tx, session_id);
    if let Err(e) = state.register_server(session.clone()).await {
        NEXT_SESSION_ID.deallocate(session_id).await;
        return Err(RegisterError::Internal(e));
    }

    // destroy key
    let handle = guard
        .handle
        .as_mut()
        .ok_or(RegisterError::Internal("No server handle"))?;
    handle.secret.fill(0);

    let packet = Attached { sid: session.sid };
    send_timeout(&session.tx, packet, Duration::from_secs(2)).await;
    info!("Server registered with id {}", session_id);
    Ok(RoleContext::Server(session))
}

async fn attach_client(
    state: &RelayState,
    tx: Tx,
    addr: &SocketAddrV4,
    incoming: Bytes,
) -> Result<RoleContext, RegisterError> {
    if incoming.len() != 17 {
        send_code(&tx, INVALID_REGISTER_PACKET);
        return Err(RegisterError::InvalidPacket);
    }

    let mut uuid = [0u8; 16];
    uuid.copy_from_slice(&incoming[1..17]);
    let uuid = uuid;

    if is_nil_uuid(&uuid) {
        send_code(&tx, INVALID_REGISTER_PACKET);
        return Err(RegisterError::UuidNil);
    }

    let token = state.next_token();
    match state.open(token) {
        Entry::Occupied(_) => {
            send_code(&tx, DUPLICATE_PLAYER);
            Err(RegisterError::DuplicateClient)
        }
        Entry::Vacant(v) => {
            let (permit_tx, permit_rx) = oneshot::channel::<()>();
            let (close_tx, close_rx) = oneshot::channel::<()>();
            let pending = PendingClient::new(tx, permit_tx, close_tx);
            v.insert(pending);

            // notice the server
            if let Some(server) = state.get_server().await {
                let attached = ClientAttached {
                    token,
                    host: &addr.ip(),
                };
                send_timeout(&server.tx, attached, Duration::from_secs(2)).await;
            }

            debug!(
                "Client \"{}\" registered from \"{}\"",
                format_uuid(&uuid),
                &addr
            );

            Ok(RoleContext::Client(PendingSession {
                token,
                allow: permit_rx,
                close: close_rx,
            }))
        }
    }
}

async fn play_server(
    state: &RelayState,
    session: &Arc<Session>,
    reader: SplitStream<WebSocketStream<TcpStream>>,
) -> Option<u8> {
    server_relay(ServerContext {
        state,
        session,
        reader,
    })
    .await;

    // clean up
    if state
        .get_server()
        .await
        .as_ref()
        .map(|s| Arc::ptr_eq(s, session))
        .unwrap_or(false)
    {
        info!("Server disconnected");
        // send close and remove all records
        state.close_clients();
        state.clear_server().await;
    }

    Some(session.sid)
}

async fn play_client(
    state: &RelayState,
    mut pending: PendingSession,
    address: &SocketAddrV4,
    reader: SplitStream<WebSocketStream<TcpStream>>,
) -> Option<u8> {
    use crate::network::infrastructure::session::Admission;
    use tokio::time::sleep;

    let token = pending.token;
    let mut adm = Admission::take(state, token);
    let allowed = tokio::select! {
        _ = &mut pending.allow => true,
        _ = &mut pending.close => false,
        _ = sleep(Duration::from_secs(4)) => false,
    };

    debug!("Client \"{}\" released {}", token, allowed);
    if !allowed {
        return None;
    }

    let sid = NEXT_SESSION_ID.allocate().await?;
    // server must exist
    let Some(server) = state.get_server().await else {
        return Some(sid);
    };

    // notice server before active session
    // mustn't drop the active packet, because the relay has no means to remove that record, yet.
    let active = ClientActive { sid, address };
    let success = send_timeout(&server.tx, active, Duration::from_secs(2)).await;
    if !success {
        return Some(sid);
    }

    // try upgrade session
    let session = match state.upgrade(sid, token) {
        Ok(s) => s,
        Err(e) => {
            warn!("pending \"{}\" {}", token, e);
            // only upgrade success will return session, so no need to clean active record.
            // pending is already remove, shut receiver here.
            pending.clean();
            return Some(sid);
        }
    };
    adm.settle();

    // feed back client
    let attached = Attached { sid };
    send_timeout(&session.tx, attached, Duration::from_secs(2)).await;
    client_relay(ClientContext {
        state,
        session: &*session,
        reader,
        close_rx: pending.close,
    })
    .await;

    // remove record and notice, it's ok that loss this `Detached`
    state.remove(sid);
    send_timeout(&server.tx, Detached { sid }, Duration::from_secs(2)).await;
    Some(sid)
}
