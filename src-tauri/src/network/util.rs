use log::error;
use std::time::SystemTime;

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

pub fn get_time() -> u128 {
    let time = match SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
        Ok(d) => d.as_millis(),
        Err(e) => {
            error!("Error when getting system time: {}", e);
            0
        }
    };
    time
}
