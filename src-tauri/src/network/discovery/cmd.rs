use crate::network::discovery;
use crate::network::discovery::protocol::LanServerInfo;

#[tauri::command]
pub async fn start_lan_announce(port: u16, name: String, game_version: u16) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Server name must not be empty".into());
    }
    if trimmed.len() > discovery::protocol::MAX_NAME_LEN {
        return Err(format!(
            "Server name longer than {} bytes",
            discovery::protocol::MAX_NAME_LEN
        ));
    }
    discovery::start_announce(port, trimmed.to_string(), game_version).await
}

#[tauri::command]
pub async fn stop_lan_announce() -> bool {
    discovery::stop_announce().await
}

#[tauri::command]
pub async fn start_lan_sniff() -> Result<(), String> {
    discovery::start_sniff().await
}

#[tauri::command]
pub async fn stop_lan_sniff() -> bool {
    discovery::stop_sniff().await
}

#[tauri::command]
pub async fn list_lan_servers() -> Vec<LanServerInfo> {
    discovery::list_servers().await
}

#[tauri::command]
pub async fn is_lan_sniffing() -> bool {
    discovery::is_sniffing().await
}
