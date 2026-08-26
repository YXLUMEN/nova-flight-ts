use std::net::Ipv4Addr;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn is_nil_uuid(uuid: &[u8]) -> bool {
    uuid.iter().all(|&b| b == 0)
}

pub fn format_uuid(bytes: &[u8; 16]) -> String {
    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        bytes[6], bytes[7],
        bytes[8], bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
}

pub fn parse_session_id(cursor: &[u8], count: usize) -> Result<(Vec<u8>, &[u8]), &'static str> {
    if cursor.len() < count {
        return Err("Not enough bytes for parsing");
    }

    let excludes = cursor[..count].to_vec();
    let rest = &cursor[count..];
    Ok((excludes, rest))
}

pub fn read_var_uint(mut buf: &[u8]) -> Result<(u32, &[u8]), &'static str> {
    let mut result: u32 = 0;
    let mut shift = 0;

    loop {
        if buf.is_empty() {
            return Err("Unexpected end of buffer while reading VarUInt");
        }
        let byte = buf[0];
        buf = &buf[1..];

        result |= ((byte & 0x7F) as u32) << shift;

        if (byte & 0x80) == 0 {
            break;
        }
        shift += 7;
        if shift > 35 {
            return Err("VarUInt is too big");
        }
    }

    Ok((result, buf))
}

pub fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// 常量时间字节比较,防止时序侧信道攻击
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter()
        .zip(b.iter())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

pub fn parse_ipv4(data: &[u8]) -> Option<Ipv4Addr> {
    if data.len() < 4 {
        return None;
    }

    let bytes: [u8; 4] = data[..4].try_into().ok()?;

    let ip_num = u32::from_le_bytes(bytes);
    let ip = Ipv4Addr::from(ip_num);

    Some(ip)
}
