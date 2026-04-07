use crate::network::session::Session;
use bytes::Bytes;
use dashmap::iter::Iter;
use dashmap::mapref::one::Ref;
use dashmap::{DashMap, Entry};
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
    server: RwLock<Option<Arc<Session>>>,
    client_uuids: DashMap<[u8; 16], Arc<Session>>,
    client_ids: DashMap<u8, Arc<Session>>,
    client_waiting: DashMap<u8, oneshot::Sender<()>>,
    client_close_ctrl: DashMap<u8, oneshot::Sender<()>>,
    shutting_down: AtomicBool,
}

impl RelayState {
    pub fn new() -> Self {
        RelayState {
            server: RwLock::new(None),
            client_uuids: DashMap::new(),
            client_ids: DashMap::new(),
            client_waiting: DashMap::new(),
            client_close_ctrl: DashMap::new(),
            shutting_down: AtomicBool::new(false),
        }
    }

    pub fn get_by_uuid(&self, uuid: &[u8; 16]) -> Option<Ref<'_, [u8; 16], Arc<Session>>> {
        self.client_uuids.get(uuid)
    }

    pub fn get_by_id(&self, session_id: &u8) -> Option<Ref<'_, u8, Arc<Session>>> {
        self.client_ids.get(session_id)
    }

    pub fn iter_ids(&self) -> Iter<'_, u8, Arc<Session>> {
        self.client_ids.iter()
    }

    pub fn size(&self) -> usize {
        self.client_uuids.len()
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
        self.server.read().await.clone()
    }

    pub async fn clear_server(&self) {
        *self.server.write().await = None;
    }

    pub fn register_client(&self, uuid: [u8; 16]) -> Entry<'_, [u8; 16], Arc<Session>> {
        self.client_uuids.entry(uuid)
    }

    pub fn complete_client(
        &self,
        session_id: u8,
        session: Arc<Session>,
        permit_tx: oneshot::Sender<()>,
        close_tx: oneshot::Sender<()>,
    ) {
        self.client_ids.insert(session_id, session);
        self.client_waiting.insert(session_id, permit_tx);
        self.client_close_ctrl.insert(session_id, close_tx);
    }

    pub fn permit(&self, session_id: &u8) {
        if let Some(session) = self.client_waiting.remove(session_id) {
            let _ = session.1.send(());
        }
    }

    pub fn close(&self, session_id: &u8) {
        if let Some(close_tx) = self.client_close_ctrl.remove(session_id) {
            let _ = close_tx.1.send(());
        }
    }

    /// NOT manually remove from only one map. Use this method to remove the session.
    pub fn remove_by_id(&self, id: u8) -> Option<[u8; 16]> {
        if let Some(session) = self.client_ids.remove(&id) {
            let client_id = session.1.uuid;
            if let Some(uuid) = client_id {
                self.client_uuids.remove(&uuid);
            }
            let tx = self.client_waiting.remove(&id);
            if let Some(tx) = tx {
                drop(tx.1);
            }
            return client_id;
        }
        None
    }

    pub fn clear_clients(&self) -> () {
        self.client_uuids.clear();
        self.client_ids.clear();
        self.client_waiting.clear();
    }

    pub fn collect_client_list(&self) -> Vec<(u8, [u8; 16])> {
        self.client_ids
            .iter()
            .filter_map(|entry| entry.value().uuid.map(|uuid| (*entry.key(), uuid)))
            .collect()
    }

    pub fn schedule_shutdown(&self) {
        self.shutting_down.store(true, Ordering::Release);
    }

    pub fn is_shutdown(&self) -> bool {
        self.shutting_down.load(Ordering::Acquire)
    }
}

pub struct ServerHandle {
    pub port: u16,
    pub secret: [u8; 32],
}

pub struct ServerManager {
    pub handle: Option<ServerHandle>,
    pub stop_tx: Option<oneshot::Sender<()>>,
}
