use crate::network::infrastructure::relay::RelayState;
use bytes::Bytes;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot};

pub(crate) type Tx = mpsc::Sender<Bytes>;

#[derive(Debug)]
pub(crate) struct Session {
    pub tx: Tx,
    pub sid: u8,
}

impl Session {
    pub fn new(tx: Tx, sid: u8) -> Arc<Self> {
        Arc::new(Session { tx, sid })
    }
}

pub(crate) enum RoleContext {
    Server(Arc<Session>),
    Client(PendingSession),
}

pub(crate) struct PendingSession {
    pub token: u32,
    pub permit: oneshot::Receiver<()>,
    pub active: oneshot::Receiver<u8>,
    pub close: oneshot::Receiver<()>,
}

impl PendingSession {
    pub(crate) async fn wait_permit(&mut self) -> bool {
        tokio::select! {
            _ = &mut self.permit => true,
            _ = &mut self.close => false,
            _ = tokio::time::sleep(Duration::from_secs(4)) => false,
        }
    }

    pub(crate) async fn wait_ack(&mut self, expected_sid: u8) -> bool {
        tokio::select! {
            notice = &mut self.active => {
                notice.is_ok_and(|sid| sid == expected_sid)
            },
            _ = &mut self.close => false,
            _ =tokio::time::sleep(Duration::from_secs(2)) => false,
        }
    }
}

pub(crate) struct PendingAdmission<'a> {
    state: &'a RelayState,
    token: u32,
    settled: bool,
}

impl<'a> PendingAdmission<'a> {
    pub(crate) fn take(state: &'a RelayState, token: u32) -> Self {
        Self {
            state,
            token,
            settled: false,
        }
    }
    pub(crate) fn settle(&mut self) {
        self.settled = true;
    }
}

impl Drop for PendingAdmission<'_> {
    fn drop(&mut self) {
        if !self.settled {
            self.state.reject(self.token);
            self.settled = true;
        }
    }
}
