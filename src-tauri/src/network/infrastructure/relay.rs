use crate::network::infrastructure::session::{Session, Tx};
use ahash::AHashSet;
use dashmap::iter::{Iter, IterMut};
use dashmap::mapref::one::RefMut;
use dashmap::{DashMap, Entry};
use std::net::IpAddr;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use tokio::sync::RwLock;
use tokio::sync::oneshot::Sender;

pub(crate) struct PendingClient {
    tx: Tx,
    permit: Option<Sender<()>>,
    close: Option<Sender<()>>,
}

impl PendingClient {
    pub fn new(tx: Tx, permit: Sender<()>, close: Sender<()>) -> Self {
        PendingClient {
            tx,
            permit: Some(permit),
            close: Some(close),
        }
    }

    fn permit(&mut self) {
        if let Some(tx) = self.permit.take() {
            let _ = tx.send(());
        }
    }

    fn close(&mut self) {
        if let Some(tx) = self.close.take() {
            let _ = tx.send(());
        }
    }

    fn upgrade(self, sid: u8) -> Result<ActiveClient, &'static str> {
        if self.permit.is_some() {
            return Err("must permit at first");
        }
        if self.close.is_none() {
            return Err("channel closed");
        }

        let session = Session::new(self.tx, sid);
        Ok(ActiveClient {
            session,
            close: self.close,
        })
    }
}

pub(crate) struct ActiveClient {
    pub session: Arc<Session>,
    close: Option<Sender<()>>,
}

impl ActiveClient {
    pub fn close(&mut self) {
        if let Some(tx) = self.close.take() {
            let _ = tx.send(());
        }
    }
}

pub(crate) struct RelayState {
    server: RwLock<Option<Arc<Session>>>,
    pending_id: AtomicU32,
    pending: DashMap<u32, PendingClient>,
    active: DashMap<u8, ActiveClient>,
    banned: RwLock<AHashSet<IpAddr>>,
    shutting_down: AtomicBool,
}

impl RelayState {
    pub fn new() -> Self {
        RelayState {
            server: RwLock::new(None),
            pending_id: AtomicU32::new(1),
            pending: DashMap::new(),
            active: DashMap::new(),
            banned: RwLock::new(AHashSet::new()),
            shutting_down: AtomicBool::new(false),
        }
    }

    pub async fn get_server(&self) -> Option<Arc<Session>> {
        self.server.read().await.clone()
    }

    pub async fn register_server(&self, session: Arc<Session>) -> Result<(), &'static str> {
        let mut guard = self.server.write().await;
        if guard.is_some() {
            return Err("Server already exists");
        }
        *guard = Some(session);
        Ok(())
    }

    pub async fn clear_server(&self) {
        *self.server.write().await = None;
    }

    pub fn get_mut(&self, sid: u8) -> Option<RefMut<'_, u8, ActiveClient>> {
        self.active.get_mut(&sid)
    }

    /// remove `ActiveClient`
    pub fn remove(&self, sid: u8) -> Option<(u8, ActiveClient)> {
        self.active.remove(&sid)
    }

    pub fn iter(&self) -> Iter<'_, u8, ActiveClient> {
        self.active.iter()
    }

    pub fn iter_mut(&self) -> IterMut<'_, u8, ActiveClient> {
        self.active.iter_mut()
    }

    pub fn active_len(&self) -> usize {
        self.active.len()
    }

    /// load token, wraps around on overflow.
    pub fn next_token(&self) -> u32 {
        loop {
            let old = self.pending_id.fetch_add(1, Ordering::Relaxed);
            let next = old.wrapping_add(1);
            if next != 0 {
                return next;
            }
        }
    }

    pub fn open(&self, token: u32) -> Entry<'_, u32, PendingClient> {
        self.pending.entry(token)
    }

    pub fn pending_len(&self) -> usize {
        self.pending.len()
    }

    /// get `PendingCLient` with token then send permit.
    pub fn permit(&self, token: u32) {
        if let Some(mut entry) = self.pending.get_mut(&token) {
            entry.permit();
        }
    }

    /// remove `PendingClient` with token then send close.
    pub fn reject(&self, token: u32) {
        if let Some(mut entry) = self.pending.remove(&token) {
            entry.1.close();
        }
    }

    /// remove `PendingClient` then promote to `ActiveClient`.
    pub fn upgrade(&self, sid: u8, token: u32) -> Result<Arc<Session>, &'static str> {
        let Some(entry) = self.pending.remove(&token) else {
            return Err("no pending client with token");
        };

        let pending = entry.1;
        let client = pending.upgrade(sid)?;
        let session = client.session.clone();
        self.active.insert(sid, client);
        Ok(session)
    }

    /// iter all clients and close them
    pub fn close_clients(&self) {
        self.pending.iter_mut().for_each(|mut client| {
            client.close();
        });
        self.active.iter_mut().for_each(|mut client| {
            client.close();
        });
    }

    /// remove clients without close
    pub fn clear_clients(&self) {
        self.pending.clear();
        self.active.clear();
    }

    pub fn schedule_shutdown(&self) {
        self.shutting_down.store(true, Ordering::Release);
    }

    pub fn is_shutdown(&self) -> bool {
        self.shutting_down.load(Ordering::Acquire)
    }

    pub async fn is_banned(&self, ip: &IpAddr) -> bool {
        let guard = self.banned.read().await;
        guard.contains(ip)
    }

    pub async fn ban(&self, ip: IpAddr) -> bool {
        self.banned.write().await.insert(ip)
    }

    pub async fn unban(&self, ip: &IpAddr) -> bool {
        self.banned.write().await.remove(ip)
    }

    pub async fn unban_all(&self) {
        self.banned.write().await.clear();
    }
}

pub(crate) struct RelayInfo {
    pub port: u16,
    pub secret: [u8; 32],
}

pub(crate) struct RelayManager {
    pub handle: Option<RelayInfo>,
    pub stop_tx: Option<Sender<()>>,
}
