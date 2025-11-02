use crate::network::session::Session;
use bytes::Bytes;
use dashmap::DashMap;
use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use tokio::sync::{mpsc, oneshot, RwLock};

pub type Tx = mpsc::Sender<Bytes>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    Server,
    Client,
}

pub struct RelayState {
    pub server: RwLock<Option<Arc<Session>>>,
    pub clients: DashMap<[u8; 16], Arc<Session>>,
    shutting_down: AtomicBool,
}

impl RelayState {
    pub fn new() -> Self {
        RelayState {
            server: RwLock::new(None),
            clients: DashMap::new(),
            shutting_down: AtomicBool::new(false),
        }
    }

    pub async fn register_server(&self, session: Arc<Session>) -> Result<(), &'static str> {
        let mut guard = self.server.write().await;
        if guard.is_some() {
            return Err("Server already exists");
        }
        *guard = Some(session);
        Ok(())
    }

    pub async fn get_server(&self) -> Option<Arc<Session>> {
        let guard = self.server.read().await;
        guard.clone()
    }

    pub async fn clear_server(&self) {
        *self.server.write().await = None;
    }

    pub fn schedule_shutdown(&self) {
        self.shutting_down.store(true, Ordering::SeqCst);
    }

    pub fn is_shutdown(&self) -> bool {
        self.shutting_down.load(Ordering::Relaxed)
    }
}

pub struct ServerHandle {
    pub port: u16,
}

pub struct ServerManager {
    pub handle: Option<ServerHandle>,
    pub stop_tx: Option<oneshot::Sender<()>>,
}
