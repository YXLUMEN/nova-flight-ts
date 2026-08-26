use bytes::{BufMut, Bytes, BytesMut};
use std::time::Duration;

pub const MAX_PAYLOAD_LEN: usize = 6144; // 6 KB upper bound for a single frame
pub const MAX_EXCLUDES: u32 = 16; // exclude uuid count
pub const MAX_BACKOFF: Duration = Duration::from_secs(5);
pub const MAX_CONNECTIONS: usize = 64; // u8 session id space upper bound with margin

pub trait Payload {
    const PAYLOAD_TYPE: u8;
    fn to_bytes(&self) -> Bytes {
        Bytes::from_static(&[0x00, Self::PAYLOAD_TYPE])
    }
}

pub struct Detached {
    pub session_id: u8,
}
impl Payload for Detached {
    const PAYLOAD_TYPE: u8 = 0x00;
    fn to_bytes(&self) -> Bytes {
        let buf: [u8; 3] = [0x00, Self::PAYLOAD_TYPE, self.session_id];
        Bytes::copy_from_slice(&buf)
    }
}

pub struct Attached {
    pub session_id: u8,
}
impl Payload for Attached {
    const PAYLOAD_TYPE: u8 = 0x01;

    fn to_bytes(&self) -> Bytes {
        let buf: [u8; 3] = [0x00, Self::PAYLOAD_TYPE, self.session_id];
        Bytes::copy_from_slice(&buf)
    }
}

/// 区别于 Attached,
/// 这是给服务端的通知
pub struct ClientAttached {
    pub session_id: u8,
}
impl Payload for ClientAttached {
    const PAYLOAD_TYPE: u8 = 0x02;

    fn to_bytes(&self) -> Bytes {
        let buf: [u8; 3] = [0x00, Self::PAYLOAD_TYPE, self.session_id];
        Bytes::copy_from_slice(&buf)
    }
}

pub struct RelayMessage {
    pub message: String,
}
impl Payload for RelayMessage {
    const PAYLOAD_TYPE: u8 = 0x03;

    fn to_bytes(&self) -> Bytes {
        let header: [u8; 2] = [0x00, Self::PAYLOAD_TYPE];
        let max_len = u16::MAX as usize;

        let bytes = self.message.as_bytes();
        let slice = if bytes.len() > max_len {
            &bytes[..max_len]
        } else {
            bytes
        };

        let mut buf = BytesMut::with_capacity(2 + 2 + slice.len());
        buf.put_slice(&header);
        buf.put_u16_le(slice.len() as u16);
        buf.put_slice(slice);

        buf.freeze()
    }
}

/// Server 查询当前在线客户端列表的回包
/// 格式: [0x00][0x04][count u8]([session_id u8][uuid 16B])*
pub struct QueryClientsResult {
    /// (session_id, uuid) 对列表
    pub clients: Vec<(u8, [u8; 16])>,
}
impl Payload for QueryClientsResult {
    const PAYLOAD_TYPE: u8 = 0x04;

    fn to_bytes(&self) -> Bytes {
        let count = self.clients.len().min(u8::MAX as usize);
        // header(2) + count(1) + count * (session_id(1) + uuid(16))
        let mut buf = BytesMut::with_capacity(3 + count * 17);
        buf.put_u8(0x00);
        buf.put_u8(Self::PAYLOAD_TYPE);
        buf.put_u8(count as u8);
        for (sid, uuid) in self.clients.iter().take(count) {
            buf.put_u8(*sid);
            buf.put_slice(uuid.as_ref());
        }
        buf.freeze()
    }
}
