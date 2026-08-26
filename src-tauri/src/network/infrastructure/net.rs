use crate::network::infrastructure::protocol::{Payload, RelayMessage};
use crate::network::infrastructure::states::Tx;
use bytes::Bytes;
use log::{error, warn};
use std::time::Duration;
use tokio::sync::mpsc::error::TrySendError;

/// 中继服务器发送
pub(crate) async fn send_timeout<T: Payload>(tx: &Tx, payload: T, timeout: Duration) -> () {
    let buf = payload.to_bytes();
    match tx.send_timeout(buf, timeout).await {
        Ok(()) => {}
        Err(e) => {
            error!("Failed to send relay: {}", e);
        }
    }
}

pub(crate) fn try_send_packet<T: Payload>(tx: &Tx, payload: T) -> () {
    let buf = payload.to_bytes();
    let _ = tx.try_send(buf);
}

/// 区别于 send_message.
/// 此方法只能向服务端发送
pub(crate) async fn action_fail(tx: &Tx, reason: &str) -> () {
    let packet = RelayMessage {
        message: reason.to_string(),
    };
    send_timeout(tx, packet, Duration::from_secs(2)).await;
}

/// 中继通知,目前为纯文本
pub(crate) fn send_message(tx: &Tx, reason: &str) -> () {
    let packet = RelayMessage {
        message: reason.to_string(),
    };
    try_send_packet(tx, packet);
}

/// 广播
pub(crate) fn send_or_drop(tx: &Tx, payload: &Bytes) -> bool {
    match tx.try_send(payload.clone()) {
        Ok(_) => true,
        Err(TrySendError::Full(_)) => {
            warn!("Payload drop because channel full");
            true
        }
        Err(TrySendError::Closed(_)) => false,
    }
}

pub(crate) fn send_or_drop_move(tx: &Tx, payload: Bytes) -> bool {
    match tx.try_send(payload) {
        Ok(_) => true,
        Err(TrySendError::Full(_)) => {
            warn!("Payload drop because channel full");
            true
        }
        Err(TrySendError::Closed(_)) => false,
    }
}
