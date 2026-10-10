use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, Window, WindowEvent};

pub fn show_window(app: &AppHandle) {
    let main = app.get_webview_window("main");
    if let Some(main) = main {
        let _ = main.unminimize();
        let _ = main.set_focus();
    } else {
        if let Some(win) = app.webview_windows().values().next() {
            let _ = win.set_focus();
        }
    }
}

const SAVE_GRACE_PERIOD: Duration = Duration::from_secs(8);
static SAVE_STARTED_AT: Mutex<Option<Instant>> = Mutex::new(None);

pub fn wait_saving(window: &Window, event: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };

    let guard = SAVE_STARTED_AT.lock();
    let Ok(mut started) = guard else {
        return;
    };

    match *started {
        None => {
            *started = Some(Instant::now());
            drop(started);
            api.prevent_close();
            let _ = window.emit("save_before_close", ());
        }
        Some(t) if t.elapsed() >= SAVE_GRACE_PERIOD => {
            drop(started);
        }
        Some(_) => {
            drop(started);
            api.prevent_close();
        }
    }
}

#[tauri::command]
pub async fn confirm_save_done(window: Window) {
    let _ = window.destroy();
}
