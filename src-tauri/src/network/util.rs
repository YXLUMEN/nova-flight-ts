pub fn is_nil_uuid(uuid: &[u8]) -> bool {
    uuid.iter().all(|&b| b == 0)
}

pub fn format_uuid(bytes: &[u8; 16]) -> String {
    assert_eq!(bytes.len(), 16);
    let hex: Vec<String> = bytes.iter().map(|b| format!("{:02x}", b)).collect();
    let s = hex.join("");
    format!(
        "{}-{}-{}-{}-{}",
        &s[0..8],
        &s[8..12],
        &s[12..16],
        &s[16..20],
        &s[20..32]
    )
}

pub fn parse_excludes(
    mut cursor: &[u8],
    count: u32,
) -> Result<(Vec<[u8; 16]>, &[u8]), &'static str> {
    let needed = count as usize * 16;
    if cursor.len() < needed {
        return Err("Not enough bytes for excludes");
    }

    let mut excludes = Vec::with_capacity(count as usize);

    for _ in 0..count {
        let mut id = [0u8; 16];
        id.copy_from_slice(&cursor[..16]);
        cursor = &cursor[16..];

        if !is_nil_uuid(&id) {
            excludes.push(id);
        }
    }
    Ok((excludes, cursor))
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
