use crate::network::discovery::protocol::{
    decode_announce, LanServerInfo, DISCOVERY_PORT, SERVER_TTL_MS,
};
use crate::network::util::now_ms;
use dashmap::DashMap;
use log::{error, info, warn};
use std::sync::Arc;
use tokio::net::UdpSocket;
use tokio::sync::oneshot;
use tokio::time::{interval, Duration};

pub async fn run_listen(
    servers: Arc<DashMap<String, LanServerInfo>>,
    mut stop_rx: oneshot::Receiver<()>,
) {
    let bind_addr = format!("0.0.0.0:{}", DISCOVERY_PORT);
    let socket = match UdpSocket::bind(&bind_addr).await {
        Ok(s) => s,
        Err(e) => {
            error!("LAN sniff: failed to bind {}: {}", bind_addr, e);
            return;
        }
    };

    info!("LAN sniff listening on {}", bind_addr);

    let mut buf = [0u8; 256];
    let mut prune_ticker = interval(Duration::from_millis(SERVER_TTL_MS));

    loop {
        tokio::select! {
            _ = &mut stop_rx => {
                info!("LAN sniff stopped");
                break;
            }
            _ = prune_ticker.tick() => {
                prune_expired(&servers);
            }
            recv = socket.recv_from(&mut buf) => {
                match recv {
                    Ok((len, src)) => {
                        handle_packet(&servers, &buf[..len], src.ip());
                    }
                    Err(e) => {
                        warn!("LAN sniff: recv failed: {}", e);
                    }
                }
            }
        }
    }

    servers.clear();
}

fn handle_packet(servers: &DashMap<String, LanServerInfo>, data: &[u8], src_ip: std::net::IpAddr) {
    let Some((game_version, ws_port, name)) = decode_announce(data) else {
        return;
    };

    let addr = format!("{}:{}", src_ip, ws_port);
    servers.insert(
        addr.clone(),
        LanServerInfo {
            name,
            addr,
            game_version,
            last_seen_ms: now_ms() as u64,
        },
    );
}

fn prune_expired(servers: &DashMap<String, LanServerInfo>) {
    let now = now_ms() as u64;
    servers.retain(|_, info| now.saturating_sub(info.last_seen_ms) < SERVER_TTL_MS);
}

pub fn list_alive(servers: &DashMap<String, LanServerInfo>) -> Vec<LanServerInfo> {
    prune_expired(servers);
    let mut list: Vec<LanServerInfo> = servers.iter().map(|e| e.value().clone()).collect();
    list.sort_by(|a, b| a.addr.cmp(&b.addr));
    list
}
