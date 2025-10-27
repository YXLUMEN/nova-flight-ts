use crate::wss::{start_server, stop_server};

mod wss;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        //     window::show_window(app);
        // }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            } else {
                use tauri_plugin_log::{Target, TargetKind};

                app.handle().plugin(
                    tauri_plugin_log::Builder::new()
                        .level(log::LevelFilter::Warn)
                        .target(Target::new(TargetKind::LogDir {
                            file_name: Some("nova-flight".into()),
                        }))
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_server, stop_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
