use crate::network::infrastructure::relay::RelayState;
use bytes::Bytes;
use std::sync::Arc;
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
    pub allow: oneshot::Receiver<()>,
    pub close: oneshot::Receiver<()>,
}

impl PendingSession {
    pub fn clean(&mut self) {
        self.allow.close();
        self.close.close();
    }
}

pub(crate) struct Admission<'a> {
    state: &'a RelayState,
    token: u32,
    settled: bool,
}

impl<'a> Admission<'a> {
    pub fn take(state: &'a RelayState, token: u32) -> Self {
        Self {
            state,
            token,
            settled: false,
        }
    }
    pub fn settle(&mut self) {
        self.settled = true;
    }
}

impl Drop for Admission<'_> {
    fn drop(&mut self) {
        if !self.settled {
            self.state.reject(self.token);
            self.settled = true;
        }
    }
}
