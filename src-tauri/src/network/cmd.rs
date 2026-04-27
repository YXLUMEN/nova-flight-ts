use crate::network::states::{RelayState, ServerHandle, ServerManager};
use crate::network::wss::{run_ws_server, OPEN_FLAG, SERVER_MANAGER};
use log::{error, info};
use rand::RngCore;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{oneshot, Mutex};

#[tauri::command]
pub async fn start_server(port: u16) -> Result<[u8; 32], String> {
    let state_cell = SERVER_MANAGER
        .get_or_init(|| async {
            Mutex::new(ServerManager {
                handle: None,
                stop_tx: None,
            })
        })
        .await;

    OPEN_FLAG
        .get_or_init(|| async { AtomicBool::new(false) })
        .await
        .store(false, Ordering::SeqCst);

    let mut guard = state_cell.lock().await;
    if let Some(handle) = guard.handle.as_ref() {
        return Err(format!("Server already listen on \"{}\"", handle.port));
    }

    let (tx, rx) = oneshot::channel::<()>();
    guard.stop_tx = Some(tx);

    // 开始监听
    let addr = format!("0.0.0.0:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            error!("Failed to bind {}: {}", addr, e);
            return Err("Port already in use".into());
        }
    };

    info!("WebSocket server listening on {}", addr);

    // 生成随机密钥
    let mut secret = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut secret);

    let state = Arc::new(RelayState::new());
    tokio::spawn(run_ws_server(listener, state, rx));

    guard.handle = Some(ServerHandle { port, secret });

    Ok(secret)
}

#[tauri::command]
pub async fn stop_server() -> Result<(), String> {
    let Some(state_cell) = SERVER_MANAGER.get() else {
        info!("Server not initialized");
        return Ok(());
    };

    let mut guard = state_cell.lock().await;
    if let Some(tx) = guard.stop_tx.take() {
        let _ = tx.send(());
        info!("Stopping server");
    } else {
        info!("Server not running");
    }

    Ok(())
}

#[tauri::command]
pub fn set_open() -> bool {
    if let Some(flag) = OPEN_FLAG.get() {
        let value = !flag.load(Ordering::SeqCst);
        flag.store(value, Ordering::SeqCst);
        value
    } else {
        false
    }
}

#[tauri::command]
pub fn is_open() -> bool {
    if let Some(flag) = OPEN_FLAG.get() {
        return flag.load(Ordering::SeqCst);
    }

    false
}
