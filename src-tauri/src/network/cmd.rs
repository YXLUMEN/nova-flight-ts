use crate::network::infrastructure::relay::{RelayInstance, RelaySecret, RelayState};
use crate::network::wss::{RELAY_CELL, run_ws_server};
use log::debug;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::net::TcpListener;
use tokio::sync::{Mutex, OnceCell};

static OPEN_FLAG: OnceCell<AtomicBool> = OnceCell::const_new_with(AtomicBool::new(false));

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
pub async fn stop_server() -> Result<bool, ()> {
    let Some(state_cell) = RELAY_CELL.get() else {
        debug!("Server not initialized");
        return Ok(false);
    };

    let mut guard = state_cell.lock().await;
    let running = guard.is_some();
    if let Some(t) = guard.as_mut() {
        t.stop();
    }
    Ok(running)
}

#[tauri::command]
pub fn set_open(bl: bool) -> bool {
    OPEN_FLAG.get().is_some_and(|flag| {
        flag.store(bl, Ordering::SeqCst);
        true
    })
}

#[tauri::command]
pub fn is_open() -> bool {
    OPEN_FLAG
        .get()
        .is_some_and(|flag| flag.load(Ordering::SeqCst))
}
