use crate::network::infrastructure::session::{PendingSession, Session, Tx};
use ahash::AHashSet;
use dashmap::iter::{Iter, IterMut};
use dashmap::mapref::one::RefMut;
use dashmap::{DashMap, Entry};
use log::debug;
use rand::RngCore;
use std::net::IpAddr;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use tokio::sync::RwLock;
use tokio::sync::oneshot::{Receiver, Sender, channel};

pub(crate) struct PendingClient {
    tx: Tx,
    permit: Option<Sender<()>>,
    active: Option<Sender<u8>>,
    close: Option<Sender<()>>,
}

impl PendingClient {
    pub fn create(tx: Tx, token: u32) -> (PendingClient, PendingSession) {
        let (p_tx, p_rx) = channel::<()>();
        let (a_tx, a_rx) = channel::<u8>();
        let (c_tx, c_rx) = channel::<()>();

        let client = PendingClient {
            tx,
            permit: Some(p_tx),
            active: Some(a_tx),
            close: Some(c_tx),
        };
        let session = PendingSession {
            token,
            permit: p_rx,
            active: a_rx,
            close: c_rx,
        };
        (client, session)
    }

    fn permit(&mut self) {
        if let Some(tx) = self.permit.take() {
            let _ = tx.send(());
        }
    }

    fn active(&mut self, sid: u8) {
        if let Some(tx) = self.active.take() {
            let _ = tx.send(sid);
        }
    }

    fn close(&mut self) {
        if let Some(tx) = self.close.take() {
            let _ = tx.send(());
        }
    }

    fn upgrade(self, sid: u8) -> Option<ActiveClient> {
        assert!(self.permit.is_none(), "upgrade before permit");
        assert!(self.active.is_none(), "upgrade before active ack");

        if self.close.is_none() {
            return None;
        }

        let session = Session::new(self.tx, sid);
        Some(ActiveClient {
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

    /// get `PendingClient` and send active.
    pub fn active(&self, sid: u8, token: u32) {
        if let Some(mut entry) = self.pending.get_mut(&token) {
            entry.active(sid);
        }
    }

    /// remove `PendingClient` then promote to `ActiveClient`.
    pub fn upgrade(&self, sid: u8, token: u32) -> Option<Arc<Session>> {
        let Some(entry) = self.pending.remove(&token) else {
            debug!("no pending client with token, relay may shutting down");
            return None;
        };

        let pending = entry.1;
        let client = pending.upgrade(sid)?;
        let session = client.session.clone();
        self.active.insert(sid, client);
        Some(session)
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

pub(crate) type RelaySecret = [u8; 32];

pub(crate) struct RelayInstance {
    pub port: u16,
    stop: Option<Sender<()>>,
    secret: Option<RelaySecret>,
}

pub(crate) struct InstanceRecord {
    pub instance: RelayInstance,
    pub secret: RelaySecret,
    pub stop: Receiver<()>,
}

impl RelayInstance {
    pub fn create(port: u16) -> InstanceRecord {
        let (tx, rx) = channel::<()>();
        let mut secret = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut secret);

        let instance = RelayInstance {
            port,
            stop: Some(tx),
            secret: Some(secret),
        };
        InstanceRecord {
            instance,
            stop: rx,
            secret,
        }
    }

    pub(crate) fn secret(&self) -> Option<&RelaySecret> {
        self.secret.as_ref()
    }

    pub(crate) fn burnout_secret(&mut self) {
        if let Some(mut key) = self.secret.take() {
            key.fill(0);
        }
    }

    pub(crate) fn stop(&mut self) -> bool {
        self.stop.take().is_some_and(|tx| {
            let _ = tx.send(());
            true
        })
    }
}
