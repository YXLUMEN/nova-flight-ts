use crate::network::infrastructure::header::C2S;
use crate::network::infrastructure::net::send_message;
use crate::network::infrastructure::protocol::MAX_PAYLOAD_LEN;
use crate::network::infrastructure::session::Session;
use crate::network::infrastructure::states::RelayState;
use crate::network::infrastructure::util::format_uuid;
use bytes::{Buf, Bytes};
use futures_util::stream::SplitStream;
use futures_util::StreamExt;
use log::{error, info, warn};
use tokio::net::TcpStream;
use tokio::sync::oneshot;
use tokio_tungstenite::tungstenite::{Error, Message};
use tokio_tungstenite::WebSocketStream;

pub(crate) struct ClientContext<'a> {
    pub state: &'a RelayState,
    pub session: &'a Session,
    pub reader: SplitStream<WebSocketStream<TcpStream>>,
    pub close_rx: oneshot::Receiver<()>,
}

pub(crate) async fn client_relay(mut ctx: ClientContext<'_>) -> () {
    loop {
        tokio::select! {
            _ = &mut ctx.close_rx => break,
            msg = ctx.reader.next() => {
                let Some(msg) = msg else { return; };
                if !on_recv_client(&ctx.state, &ctx.session, msg).await {
                    break;
                }
            }
        }
    }
}

async fn on_recv_client(
    state: &RelayState,
    session: &Session,
    msg: Result<Message, Error>,
) -> bool {
    match msg {
        Ok(Message::Binary(payload)) => {
            if payload.len() > MAX_PAYLOAD_LEN {
                send_message(&session.tx, "ERR:Payload too large");
                return false;
            }

            relay_client_message(state, session, payload).await
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

async fn relay_client_message(state: &RelayState, session: &Session, payload: Bytes) -> bool {
    if payload.is_empty() {
        info!("Empty message received");
        return true;
    }

    match payload[0] {
        C2S => {
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
