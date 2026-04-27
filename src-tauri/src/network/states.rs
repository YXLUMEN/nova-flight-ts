use crate::network::session::Session;
use bytes::Bytes;
use dashmap::iter::Iter;
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

pub(crate) struct ClientEntry {
    pub session: Arc<Session>,
    permit_tx: Option<oneshot::Sender<()>>,
    close_tx: Option<oneshot::Sender<()>>,
}

pub struct RelayState {
    server: RwLock<Option<Arc<Session>>>,
    clients: DashMap<u8, ClientEntry>,
    client_uuids: DashMap<[u8; 16], u8>,
    shutting_down: AtomicBool,
}

impl RelayState {
    pub fn new() -> Self {
        RelayState {
            server: RwLock::new(None),
            clients: DashMap::new(),
            client_uuids: DashMap::new(),
            shutting_down: AtomicBool::new(false),
        }
    }

    pub fn get_by_uuid(&self, uuid: &[u8; 16]) -> Option<Arc<Session>> {
        let session_id = *self.client_uuids.get(uuid)?.value();
        Some(self.clients.get(&session_id)?.value().session.clone())
    }

    pub fn get_by_id(&self, session_id: &u8) -> Option<Arc<Session>> {
        Some(self.clients.get(session_id)?.value().session.clone())
    }

    pub fn iter_clients(&self) -> Iter<'_, u8, ClientEntry> {
        self.clients.iter()
    }

    pub fn size(&self) -> usize {
        self.clients.len()
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

    pub fn register_client(&self, uuid: [u8; 16]) -> Entry<'_, [u8; 16], u8> {
        self.client_uuids.entry(uuid)
    }

    pub fn insert_client_entry(
        &self,
        session_id: u8,
        session: Arc<Session>,
        permit_tx: oneshot::Sender<()>,
        close_tx: oneshot::Sender<()>,
    ) {
        self.clients.insert(
            session_id,
            ClientEntry {
                session,
                permit_tx: Some(permit_tx),
                close_tx: Some(close_tx),
            },
        );
    }

    pub fn permit(&self, session_id: &u8) {
        if let Some(mut entry) = self.clients.get_mut(session_id) {
            if let Some(tx) = entry.permit_tx.take() {
                let _ = tx.send(());
            }
        }
    }

    pub fn close(&self, session_id: &u8) {
        if let Some(mut entry) = self.clients.get_mut(session_id) {
            if let Some(tx) = entry.close_tx.take() {
                let _ = tx.send(());
            }
        }
    }

    /// NOT manually remove from only one map. Use this method to remove the session.
    pub fn remove_by_id(&self, id: u8) -> Option<[u8; 16]> {
        let (_, entry) = self.clients.remove(&id)?;
        let client_id = entry.session.uuid;
        if let Some(uuid) = client_id {
            self.client_uuids.remove(&uuid);
        }
        client_id
    }

    pub fn clear_clients(&self) {
        self.client_uuids.clear();
        self.clients.clear();
    }

    pub fn collect_client_list(&self) -> Vec<(u8, [u8; 16])> {
        self.clients
            .iter()
            .filter_map(|entry| {
                let session_id = *entry.key();
                entry.value().session.uuid.map(|uuid| (session_id, uuid))
            })
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
