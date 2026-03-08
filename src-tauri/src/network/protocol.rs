use bytes::{BufMut, Bytes, BytesMut};

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
    pub uuid: [u8; 16],
}
impl Payload for ClientAttached {
    const PAYLOAD_TYPE: u8 = 0x02;

    fn to_bytes(&self) -> Bytes {
        let mut buf: [u8; 19] = [0; 19];
        buf[0] = 0x00;
        buf[1] = Self::PAYLOAD_TYPE;
        buf[2] = self.session_id;
        buf[3..].copy_from_slice(&self.uuid);
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
