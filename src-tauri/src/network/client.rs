use crate::network::infrastructure::header::{C2S, PACKET_TOO_LARGE};
use crate::network::infrastructure::heartbeat::{HeartBeat, IdleWatch};
use crate::network::infrastructure::net::send_code;
use crate::network::infrastructure::protocol::MAX_PAYLOAD_LEN;
use crate::network::infrastructure::relay::RelayState;
use crate::network::infrastructure::session::Session;
use bytes::{Buf, Bytes};
use futures_util::StreamExt;
use futures_util::stream::SplitStream;
use log::{debug, error, warn};
use tokio::net::TcpStream;
use tokio::sync::oneshot;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::{Error, Message};

pub(crate) struct ClientContext<'a> {
    pub state: &'a RelayState,
    pub session: &'a Session,
    pub reader: SplitStream<WebSocketStream<TcpStream>>,
    pub close_rx: oneshot::Receiver<()>,
}

pub(crate) async fn client_relay(mut ctx: ClientContext<'_>) -> () {
    use std::pin::pin;
    use tokio::time::sleep_until;

    let mut watch = IdleWatch::new();
    let mut timer = pin!(sleep_until(watch.deadline()));

    loop {
        tokio::select! {
            _ = &mut ctx.close_rx => break,
            _ = &mut timer => break,
            msg = ctx.reader.next() => {
                let Some(msg) = msg else {
                    break;
                };
                let beat = on_recv(&ctx.state, &ctx.session, msg).await;
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

async fn on_recv(state: &RelayState, session: &Session, msg: Result<Message, Error>) -> HeartBeat {
    match msg {
        Ok(Message::Binary(payload)) => {
            if payload.len() > MAX_PAYLOAD_LEN {
                send_code(&session.tx, PACKET_TOO_LARGE);
                return HeartBeat::Break;
            }

            relay_client_message(state, session, payload).await
        }
        Ok(Message::Close(_)) => HeartBeat::Break,
        Ok(_) => HeartBeat::Fresh,
        Err(e) => {
            error!(
                "WebSocket read failed from client \"{}\":\n {}",
                session.sid, e
            );
            HeartBeat::Break
        }
    }
}

async fn relay_client_message(state: &RelayState, session: &Session, payload: Bytes) -> HeartBeat {
    if payload.is_empty() {
        debug!("Empty message received");
        return HeartBeat::Fresh;
    }

    match payload[0] {
        C2S => {
            // Client → Server
            let Some(server) = state.get_server().await else {
                return HeartBeat::Fresh;
            };

            if payload.len() < 3 {
                debug!("InvalidPacket: Client message too short");
                return HeartBeat::Fresh;
            }

            // 解析验证 sessionId
            let mut cursor = &payload[1..2];
            let session_id = cursor.get_u8();
            if session_id != session.sid {
                warn!("Invalid sessionId from client, dropping connection");
                return HeartBeat::Break;
            }

            let Err(e) = server.tx.try_send(payload) else {
                return HeartBeat::Fresh;
            };
            error!(
                "Failed to forward message from Client \"{}\":\n {}",
                session.sid, e
            );
            HeartBeat::Break
        }
        _ => HeartBeat::Fresh,
    }
}
