use crate::network::infrastructure::header::*;
use crate::network::infrastructure::net::*;
use crate::network::infrastructure::protocol::{MAX_EXCLUDES, MAX_PAYLOAD_LEN, QueryClientsResult};
use crate::network::infrastructure::session::Session;
use crate::network::infrastructure::states::RelayState;
use crate::network::infrastructure::util::{
    format_uuid, parse_ipv4, parse_session_id, read_var_uint,
};
use bytes::{BufMut, Bytes, BytesMut};
use futures_util::StreamExt;
use futures_util::stream::SplitStream;
use log::{debug, error, warn};
use std::time::Duration;
use tokio::net::TcpStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::Message;

pub(crate) struct ServerContext<'a> {
    pub state: &'a RelayState,
    pub session: &'a Session,
    pub reader: SplitStream<WebSocketStream<TcpStream>>,
}

pub(crate) async fn server_relay(mut ctx: ServerContext<'_>) {
    while let Some(msg) = ctx.reader.next().await {
        match msg {
            Ok(Message::Binary(payload)) => {
                if payload.len() > MAX_PAYLOAD_LEN {
                    send_code(&ctx.session.tx, PACKET_TOO_LARGE);
                    break;
                }

                relay_server_message(&ctx.state, &ctx.session, payload).await;
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

async fn relay_server_message(state: &RelayState, session: &Session, payload: Bytes) {
    if payload.is_empty() {
        debug!("Empty message received");
        return;
    }

    match payload[0] {
        SERVER_BROADCAST => {
            // [Header][SID][Data]
            let mut to_close = Vec::new();
            for entry in state.iter() {
                let session = entry.value();
                if send_or_drop(&session.tx, &payload) {
                    continue;
                }

                if let Some(uuid) = session.uuid {
                    warn!(
                        "[Broadcast] Dropping unresponsive client \"{}\"",
                        format_uuid(&uuid)
                    );
                }
                to_close.push(*entry.key());
            }

            for id in to_close {
                state.close(&id);
            }
        }
        SERVER_SINGLE => {
            // [Header][SID][Data]
            if payload.len() < 2 {
                warn!("InvalidPacket: Unicast packet too short");
                return;
            }

            // SessionId
            let target_id = payload[1];
            let Some(session) = state.by_id(&target_id) else {
                return;
            };
            if send_or_drop_move(&session.tx, payload) {
                return;
            }
            state.close(&target_id);
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
                send_code(&session.tx, EXCLUDE_TOO_MUCH);
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

            let mut to_close = Vec::new();
            for entry in state.iter() {
                let id = *entry.key();
                if excludes.iter().any(|ex| ex == &id) {
                    continue;
                }

                let session = entry.value();
                if send_or_drop(&session.tx, &forwarded) {
                    continue;
                }

                if let Some(uuid) = session.uuid {
                    warn!(
                        "[Excludes] Dropping unresponsive client \"{}\"",
                        format_uuid(&uuid)
                    );
                }
                to_close.push(id);
            }

            for id in to_close {
                state.close(&id);
            }
        }
        SERVER_ACTION => relay_actions(state, session, payload).await,
        _ => {}
    }
}

async fn relay_actions(state: &RelayState, session: &Session, payload: Bytes) -> () {
    // 协议格式: [Header 0xff][Type 1][Data n]
    if payload.len() < 2 {
        action_fail(&session.tx, INVALID_ACTION).await;
        return;
    }

    let data = &payload[2..];
    match payload[1] {
        KICK => {
            if data.len() != 1 {
                action_fail(&session.tx, EMPTY_SID).await;
                return;
            }

            let session_id = data[0];
            if let Some(session) = state.any_by_id(&session_id) {
                send_code(&session.tx, KICKED);
                state.close(&session_id);
            }
        }
        PERMIT => {
            if data.len() != 1 {
                action_fail(&session.tx, EMPTY_SID).await;
                return;
            }
            state.permit(&data[0]);
        }
        QUERY => {
            // QueryClients: 查询当前所有在线客户端列表
            // 回包格式: [0x00][0x04][count u8]([session_id u8][uuid 16B])*
            let clients = state.collect_client_list();
            let result = QueryClientsResult { clients };
            send_timeout(&session.tx, result, Duration::from_secs(2)).await;
        }
        BAN_IP => {
            let addr = parse_ipv4(data);
            let Some(ip) = addr else {
                action_fail(&session.tx, INVALID_IPV4).await;
                return;
            };

            state.ban(ip.into()).await;
            send_message(&session.tx, BANED, &[&*ip.to_string()]);
        }
        UNBAN_IP => {
            let addr = parse_ipv4(data);
            let Some(ip) = addr else {
                action_fail(&session.tx, INVALID_IPV4).await;
                return;
            };

            if state.unban(&ip.into()).await {
                send_message(&session.tx, UNBAN, &[&*ip.to_string()]);
            } else {
                send_code(&session.tx, DID_NOT_BANED);
            }
        }
        _ => {
            warn!("Invalid action type: 0x{:02x}", payload[1]);
            action_fail(&session.tx, UNKNOWN_ACTION).await;
        }
    };
}
