use crate::network::discovery::protocol::{encode_announce, ANNOUNCE_INTERVAL_MS, DISCOVERY_PORT};
use log::{error, info, warn};
use std::net::SocketAddr;
use tokio::net::UdpSocket;
use tokio::sync::oneshot;
use tokio::time::{interval, Duration};

pub async fn run_announce(
    ws_port: u16,
    name: String,
    game_version: u16,
    mut stop_rx: oneshot::Receiver<()>,
) {
    let socket = match UdpSocket::bind("0.0.0.0:0").await {
        Ok(s) => s,
        Err(e) => {
            error!("LAN announce: failed to bind UDP socket: {}", e);
            return;
        }
    };

    if let Err(e) = socket.set_broadcast(true) {
        error!("LAN announce: failed to enable broadcast: {}", e);
        return;
    }

    let broadcast_addr: SocketAddr = ([255, 255, 255, 255], DISCOVERY_PORT).into();
    let packet = encode_announce(game_version, ws_port, &name);
    let mut ticker = interval(Duration::from_millis(ANNOUNCE_INTERVAL_MS));

    info!(
        "LAN announce started: name=\"{}\" ws_port={} discovery_port={}",
        name, ws_port, DISCOVERY_PORT
    );

    loop {
        tokio::select! {
            _ = &mut stop_rx => {
                info!("LAN announce stopped");
                break;
            }
            _ = ticker.tick() => {
                if let Err(e) = socket.send_to(&packet, broadcast_addr).await {
                    warn!("LAN announce: send failed: {}", e);
                }
            }
        }
    }
}
