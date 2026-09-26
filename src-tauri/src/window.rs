use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager, Window, WindowEvent};

pub fn show_window(app: &AppHandle) {
    let main = app.get_webview_window("main");
    if let Some(main) = main {
        main.unminimize().expect("Sorry, can't unminimize window");
        main.set_focus().expect("Sorry, can't focus window");
    } else {
        app.webview_windows()
            .values()
            .next()
            .expect("Sorry, no window found")
            .set_focus()
            .expect("Can't Bring Window to Focus");
    }
}

static CLOSE_FLAG: AtomicBool = AtomicBool::new(false);

pub fn wait_saving(window: &Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        if !CLOSE_FLAG.swap(true, Ordering::SeqCst) {
            api.prevent_close();
            let _ = window.emit("save_before_close", ());
            return;
        }
        api.prevent_close();
    }
}

#[tauri::command]
pub async fn confirm_save_done(window: Window) {
    let _ = window.destroy();
}
