mod announce;
pub mod cmd;
mod listen;
pub(crate) mod protocol;

use crate::network::discovery::protocol::LanServerInfo;
use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::{oneshot, Mutex, OnceCell};

pub struct DiscoveryManager {
    announce_stop: Option<oneshot::Sender<()>>,
    sniff_stop: Option<oneshot::Sender<()>>,
    servers: Arc<DashMap<String, LanServerInfo>>,
}

impl DiscoveryManager {
    fn new() -> Self {
        Self {
            announce_stop: None,
            sniff_stop: None,
            servers: Arc::new(DashMap::new()),
        }
    }
}

static DISCOVERY_MANAGER: OnceCell<Mutex<DiscoveryManager>> = OnceCell::const_new();

async fn manager() -> &'static Mutex<DiscoveryManager> {
    DISCOVERY_MANAGER
        .get_or_init(|| async { Mutex::new(DiscoveryManager::new()) })
        .await
}

pub(crate) async fn start_announce(
    port: u16,
    name: String,
    game_version: u16,
) -> Result<(), String> {
    let mut guard = manager().await.lock().await;

    if let Some(tx) = guard.announce_stop.take() {
        let _ = tx.send(());
    }

    let (tx, rx) = oneshot::channel();
    guard.announce_stop = Some(tx);

    tokio::spawn(announce::run_announce(port, name, game_version, rx));
    Ok(())
}

pub(crate) async fn stop_announce() -> bool {
    let mut guard = manager().await.lock().await;
    if let Some(tx) = guard.announce_stop.take() {
        let _ = tx.send(());
        true
    } else {
        false
    }
}

pub(crate) async fn start_sniff() -> Result<(), String> {
    let mut guard = manager().await.lock().await;

    if guard.sniff_stop.is_some() {
        return Ok(());
    }

    let (tx, rx) = oneshot::channel();
    guard.sniff_stop = Some(tx);
    let servers = guard.servers.clone();

    tokio::spawn(listen::run_listen(servers, rx));
    Ok(())
}

pub(crate) async fn stop_sniff() -> bool {
    let mut guard = manager().await.lock().await;
    if let Some(tx) = guard.sniff_stop.take() {
        let _ = tx.send(());
        true
    } else {
        false
    }
}

pub(crate) async fn is_sniffing() -> bool {
    let guard = manager().await.lock().await;
    guard.sniff_stop.is_some()
}

pub(crate) async fn list_servers() -> Vec<LanServerInfo> {
    let guard = manager().await.lock().await;
    listen::list_alive(&guard.servers)
}
