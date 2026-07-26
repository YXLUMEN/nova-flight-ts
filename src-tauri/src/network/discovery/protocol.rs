use bytes::{BufMut, Bytes, BytesMut};

pub(crate) const DISCOVERY_PORT: u16 = 25567;
pub(crate) const PROTOCOL_VERSION: u8 = 1;
pub(crate) const KIND_ANNOUNCE: u8 = 0;
pub(crate) const MAGIC: &[u8; 4] = b"NFDS";
pub(crate) const MAX_NAME_LEN: usize = 64;
pub(crate) const ANNOUNCE_INTERVAL_MS: u64 = 1500;
pub(crate) const SERVER_TTL_MS: u64 = 5000;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LanServerInfo {
    pub name: String,
    pub addr: String,
    pub game_version: u16,
    pub last_seen_ms: u64,
}

/// Encode an announcement packet.
/// Layout: magic(4) | version(1) | kind(1) | game_version(2 LE) | ws_port(2 LE) | name_len(1) | name
pub fn encode_announce(game_version: u16, ws_port: u16, name: &str) -> Bytes {
    let name_bytes = name.as_bytes();
    let name_len = name_bytes.len().min(MAX_NAME_LEN);

    let mut buf = BytesMut::with_capacity(4 + 1 + 1 + 2 + 2 + 1 + name_len);
    buf.extend_from_slice(MAGIC);
    buf.put_u8(PROTOCOL_VERSION);
    buf.put_u8(KIND_ANNOUNCE);

    buf.extend_from_slice(&game_version.to_le_bytes());
    buf.extend_from_slice(&ws_port.to_le_bytes());

    buf.put_u8(name_len as u8);
    buf.extend_from_slice(&name_bytes[..name_len]);
    buf.freeze()
}

/// Decode an announcement packet. Returns (game_version, ws_port, name).
pub fn decode_announce(buf: &[u8]) -> Option<(u16, u16, String)> {
    if buf.len() < 11 {
        return None;
    }
    if &buf[0..4] != MAGIC {
        return None;
    }
    if buf[4] != PROTOCOL_VERSION {
        return None;
    }
    if buf[5] != KIND_ANNOUNCE {
        return None;
    }

    let game_version = u16::from_le_bytes([buf[6], buf[7]]);
    let ws_port = u16::from_le_bytes([buf[8], buf[9]]);
    let name_len = buf[10] as usize;
    if name_len > MAX_NAME_LEN || buf.len() < 11 + name_len {
        return None;
    }

    let name = String::from_utf8_lossy(&buf[11..11 + name_len])
        .trim()
        .to_string();
    if name.is_empty() {
        return None;
    }

    Some((game_version, ws_port, name))
}
