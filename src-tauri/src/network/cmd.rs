use crate::network::infrastructure::relay::{RelayInstance, RelaySecret, RelayState};
use crate::network::wss::{RELAY_CELL, run_ws_server};
use log::debug;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn start_server(port: u16) -> Result<RelaySecret, String> {
    let state_cell = RELAY_CELL.get_or_init(|| async { Mutex::new(None) }).await;

    let mut slot = state_cell.lock().await;
    if let Some(exist) = slot.as_ref() {
        return Err(format!("Server already listen on \"{}\"", exist.port));
    }

    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Failed to bind {}: {}", addr, e))?;
    debug!("WebSocket server listening on {}", addr);

    let record = RelayInstance::create(port);
    *slot = Some(record.instance);
    drop(slot);

    let state = Arc::new(RelayState::new());
    tokio::spawn(run_ws_server(listener, state, record.stop));

    Ok(record.secret)
}

#[tauri::command]
pub async fn stop_server() -> bool {
    let Some(state_cell) = RELAY_CELL.get() else {
        debug!("Server not initialized");
        return false;
    };

    let mut guard = state_cell.lock().await;
    let running = guard.is_some();
    if let Some(t) = guard.as_mut() {
        t.stop();
    }
    running
}
