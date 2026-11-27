use crate::network::infrastructure::header::*;
use crate::network::infrastructure::heartbeat::{HeartBeat, IdleWatch};
use crate::network::infrastructure::net::*;
use crate::network::infrastructure::protocol::{MAX_EXCLUDES, MAX_PAYLOAD_LEN};
use crate::network::infrastructure::relay::RelayState;
use crate::network::infrastructure::session::Session;
use crate::network::infrastructure::util::{parse_session_id, read_var_uint};
use bytes::{BufMut, Bytes, BytesMut};
use futures_util::StreamExt;
use futures_util::stream::SplitStream;
use log::{debug, error, info, warn};
use tokio::net::TcpStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::{Error, Message};

pub(crate) struct ServerContext<'a> {
    pub state: &'a RelayState,
    pub session: &'a Session,
    pub reader: SplitStream<WebSocketStream<TcpStream>>,
}

pub(crate) async fn server_relay(mut ctx: ServerContext<'_>) {
    use std::pin::pin;
    use tokio::time::sleep_until;

    let mut watch = IdleWatch::new();
    let mut timer = pin!(sleep_until(watch.deadline()));

    loop {
        tokio::select! {
            _ = &mut timer => {
                debug!("server \"{}\" idle timeout", ctx.session.sid);
                break;
            }
            msg = ctx.reader.next() => {
                let Some(msg) = msg else {
                    break;
                };
                let beat = on_recv(msg, &ctx).await;
                if beat == HeartBeat::Break {
                    break;
                }

                if let Some(deadline) = watch.should_reset(beat) {
                    timer.as_mut().reset(deadline);
                }
            }
        }
    }
}

async fn on_recv(msg: Result<Message, Error>, ctx: &ServerContext<'_>) -> HeartBeat {
    match msg {
        Ok(Message::Binary(payload)) => {
            if payload.len() > MAX_PAYLOAD_LEN {
                send_code(&ctx.session.tx, PACKET_TOO_LARGE);
                return HeartBeat::Break;
            }

            relay_server_message(&ctx.state, &ctx.session, payload).await;
            HeartBeat::Fresh
        }
        Ok(Message::Close(_)) => HeartBeat::Break,
        Ok(_) => HeartBeat::Fresh,
        Err(e) => {
            error!("WebSocket read failed from server  {}", e);
            HeartBeat::Break
        }
    }
}

async fn relay_server_message(state: &RelayState, server: &Session, payload: Bytes) {
    if payload.is_empty() {
        debug!("Empty message received");
        return;
    }

    match payload[0] {
        SERVER_BROADCAST => {
            // [Header][SID][Data]
            for mut entry in state.iter_mut() {
                let client = entry.value_mut();
                let session = &client.session;
                if send_or_drop(&session.tx, &payload) {
                    continue;
                }
                info!("[Broadcast] Dropping client \"{}\"", session.sid);
                client.close();
            }
        }
        SERVER_SINGLE => {
            // [Header][SID][Data]
            if payload.len() < 2 {
                warn!("InvalidPacket: Unicast packet too short");
                return;
            }

            // SessionId
            let sid = payload[1];
            let Some(mut client) = state.get_mut(sid) else {
                return;
            };

            let session = &client.session;
            if send_or_drop_move(&session.tx, payload) {
                return;
            }

            info!("[Broadcast] Dropping client \"{}\"", session.sid);
            client.close();
        }
        SERVER_EXCLUDE => {
            // [Header][SID][TargetIds][Data]
            // Server → 广播给未被排除的 Client
            if payload.len() < 3 {
                warn!("InvalidPacket: BroadcastExcluding too short");
                return;
            }

            let mut cursor = &payload[2..];

            let (count, remaining) = match read_var_uint(cursor) {
                Ok(v) => v,
                Err(e) => {
                    warn!("Parse varUint error: {}", e);
                    return;
                }
            };

            if count > MAX_EXCLUDES {
                send_code(&server.tx, EXCLUDE_TOO_MUCH);
                warn!("InvalidPacket: Exclude list too large");
                return;
            }

            cursor = remaining;

            // 解析 id
            let (excludes, rest_payload) = match parse_session_id(cursor, count as usize) {
                Ok(v) => v,
                Err(e) => {
                    warn!("Parse exclude id error: {}", e);
                    return;
                }
            };

            let mut buf = BytesMut::with_capacity(2 + rest_payload.len());
            buf.put_u8(SERVER_BROADCAST);
            buf.put_u8(payload[1]);
            buf.put_slice(rest_payload);
            let forwarded = buf.freeze();

            for mut entry in state.iter_mut() {
                let id = *entry.key();
                if excludes.iter().any(|ex| ex == &id) {
                    continue;
                }

                let client = entry.value_mut();
                let session = &client.session;
                if send_or_drop(&session.tx, &forwarded) {
                    continue;
                }

                info!("[Excludes] Dropping client \"{}\"", session.sid);
                client.close();
            }
        }
        SERVER_ACTION => relay_actions(state, server, payload).await,
        _ => {}
    }
}

async fn relay_actions(state: &RelayState, server: &Session, payload: Bytes) {
    use crate::network::action::{ActionCtx, dispatch};

    // [Header 0xff][Type 1][Data n]
    if payload.len() < 2 {
        action_fail(&server.tx, INVALID_ACTION).await;
        return;
    }

    let ctx = ActionCtx { state, server };
    dispatch(payload[1], &payload[2..], &ctx).await;
}
