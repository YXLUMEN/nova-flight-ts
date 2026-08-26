use crate::network::infrastructure::header::{
    BAN_IP, KICK, PERMIT, QUERY, SERVER_ACTION, SERVER_BROADCAST, SERVER_EXCLUDE, SERVER_SINGLE,
    SERVER_SINGLE_UUID, UNBAN_IP,
};
use crate::network::infrastructure::net::{
    action_fail, send_message, send_or_drop, send_or_drop_move, send_timeout,
};
use crate::network::infrastructure::protocol::{QueryClientsResult, MAX_EXCLUDES, MAX_PAYLOAD_LEN};
use crate::network::infrastructure::session::Session;
use crate::network::infrastructure::states::RelayState;
use crate::network::infrastructure::util::{
    format_uuid, is_nil_uuid, parse_ipv4, parse_session_id, read_var_uint,
};
use bytes::{BufMut, Bytes, BytesMut};
use futures_util::stream::SplitStream;
use futures_util::StreamExt;
use log::{error, info, warn};
use std::time::Duration;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;

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
                    send_message(&ctx.session.tx, "ERR:Payload too large");
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
        info!("Empty message received");
        return;
    }

    match payload[0] {
        SERVER_BROADCAST => {
            // [Header][Id][Data]
            // Server → 广播给所有 Client
            let mut to_close = Vec::new();
            for entry in state.iter() {
                let session = entry.value();
                if send_or_drop(&session.tx, &payload) {
                    continue;
                }

                if let Some(uuid) = session.uuid {
                    warn!(
                        "[Broadcast] Dropping unresponsive client {}",
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
            // [Header][TargetId][Data]
            // Server → 指定 Client SessionId
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
        SERVER_SINGLE_UUID => {
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

            let Some(session) = state.by_uuid(&target_client_id) else {
                return;
            };

            let remaining = payload.slice(18..);

            let mut buf = BytesMut::with_capacity(2 + remaining.len());
            // 客户端不需要路由语义, 这里是故意设计的
            buf.put_u8(SERVER_BROADCAST);
            buf.put_u8(session.session_id);
            buf.put_slice(&remaining);
            let forwarded = buf.freeze();

            if send_or_drop_move(&session.tx, forwarded) {
                return;
            }
            state.close(&session.session_id);
        }
        SERVER_EXCLUDE => {
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
            buf.put_u8(SERVER_BROADCAST);
            buf.put_u8(session.session_id);
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
                        "[Excludes] Dropping unresponsive client {}",
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
        action_fail(&session.tx, "Invalid action packet").await;
        return;
    }

    let data = &payload[2..];
    match payload[1] {
        KICK => {
            if data.len() != 1 {
                action_fail(&session.tx, "[Kick] Session id cannot be empty").await;
                return;
            }

            let session_id = data[0];
            if let Some(session) = state.any_by_id(&session_id) {
                send_message(&session.tx, "INFO:Kicked");
                state.close(&session_id);
            }
        }
        PERMIT => {
            if data.len() != 1 {
                action_fail(&session.tx, "[Permit] Session id cannot be empty").await;
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
                action_fail(&session.tx, "[Ban] Ipv4 syntax error").await;
                return;
            };

            state.ban(ip.into()).await;
        }
        UNBAN_IP => {
            let addr = parse_ipv4(data);
            let Some(ip) = addr else {
                action_fail(&session.tx, "[Ban] Ipv4 syntax error").await;
                return;
            };

            if state.unban(&ip.into()).await {
                send_message(&session.tx, "INFO:Unban");
            } else {
                send_message(&session.tx, "INFO:This ip is not banned");
            }
        }
        _ => {
            warn!("Invalid action type: 0x{:02x}", payload[1]);
            action_fail(&session.tx, "Unknown action type").await;
        }
    };
}
