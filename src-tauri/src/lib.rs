use crate::file::{chose_dir, traverse_dir_cmd};
use crate::network::cmd::*;
use crate::network::discovery::cmd::*;
use crate::window::{confirm_save_done, wait_saving};

mod file;
mod network;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            window::show_window(app);
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            use tauri_plugin_log::{Builder, RotationStrategy, Target, TargetKind};
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    Builder::default()
                        .level(log::LevelFilter::Info)
                        .clear_targets()
                        .target(Target::new(TargetKind::Stdout))
                        .build(),
                )?;
            } else {
                let log = Builder::new()
                    .level(log::LevelFilter::Warn)
                    .clear_targets()
                    .target(Target::new(TargetKind::LogDir {
                        file_name: Some("nova-flight".into()),
                    }))
                    .rotation_strategy(RotationStrategy::KeepSome(5))
                    .build();

                app.handle().plugin(log)?;
            }
            Ok(())
        })
        .on_window_event(wait_saving)
        .invoke_handler(tauri::generate_handler![
            start_server,
            stop_server,
            set_open,
            is_open,
            chose_dir,
            traverse_dir_cmd,
            start_lan_announce,
            stop_lan_announce,
            start_lan_sniff,
            stop_lan_sniff,
            list_lan_servers,
            is_lan_sniffing,
            confirm_save_done
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
