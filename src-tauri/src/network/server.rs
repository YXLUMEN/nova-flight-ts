use crate::network::infrastructure::header::*;
use crate::network::infrastructure::heartbeat::{HeartBeat, IdleWatch};
use crate::network::infrastructure::net::*;
use crate::network::infrastructure::protocol::{MAX_EXCLUDES, MAX_PAYLOAD_LEN, QueryClientsResult};
use crate::network::infrastructure::relay::RelayState;
use crate::network::infrastructure::session::Session;
use crate::network::infrastructure::util::{parse_ipv4, parse_session_id, read_var_uint};
use bytes::{BufMut, Bytes, BytesMut};
use futures_util::StreamExt;
use futures_util::stream::SplitStream;
use log::{debug, error, info, warn};
use std::time::Duration;
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

async fn relay_actions(state: &RelayState, server: &Session, payload: Bytes) -> () {
    // 协议格式: [Header 0xff][Type 1][Data n]
    if payload.len() < 2 {
        action_fail(&server.tx, INVALID_ACTION).await;
        return;
    }

    let data = &payload[2..];
    match payload[1] {
        // kick active by its sid
        KICK => {
            if data.len() != 1 {
                action_fail(&server.tx, EMPTY_SID).await;
                return;
            }

            if let Some(mut client) = state.get_mut(data[0]) {
                send_code(&client.session.tx, KICKED);
                client.close();
            }
        }
        // allow pending client upgrade
        PERMIT => {
            if data.len() != 4 {
                action_fail(&server.tx, INVALID_TOKEN).await;
                return;
            }
            let b: &[u8] = &data[0..4];
            let token = u32::from_le_bytes(b.try_into().unwrap());
            state.permit(token);
        }
        // reject pending client
        REJECT => {
            if data.len() != 4 {
                action_fail(&server.tx, INVALID_TOKEN).await;
                return;
            }
            let b: &[u8] = &data[0..4];
            let token = u32::from_le_bytes(b.try_into().unwrap());
            state.reject(token);
        }
        QUERY => {
            // QueryClients: 查询当前所有在线客户端列表
            // 回包格式: [0x00][0x04][count u8]([session_id u8])*
            let clients = state.iter().map(|x| *x.key()).collect();
            let result = QueryClientsResult { clients };
            send_timeout(&server.tx, result, Duration::from_secs(2)).await;
        }
        BAN_IP => {
            let addr = parse_ipv4(data);
            let Some(ip) = addr else {
                action_fail(&server.tx, INVALID_IPV4).await;
                return;
            };

            state.ban(ip.into()).await;
            send_message(&server.tx, BANED, &[&*ip.to_string()]);
        }
        UNBAN_IP => {
            let addr = parse_ipv4(data);
            let Some(ip) = addr else {
                action_fail(&server.tx, INVALID_IPV4).await;
                return;
            };

            if state.unban(&ip.into()).await {
                send_message(&server.tx, UNBAN, &[&*ip.to_string()]);
            } else {
                send_code(&server.tx, DID_NOT_BANED);
            }
        }
        _ => {
            warn!("Invalid action type: 0x{:02x}", payload[1]);
            action_fail(&server.tx, UNKNOWN_ACTION).await;
        }
    };
}
