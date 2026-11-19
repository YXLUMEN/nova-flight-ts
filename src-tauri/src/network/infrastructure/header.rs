/// 连接注册
pub(crate) const REG_SERVER: u8 = 0x01;
pub(crate) const REG_CLIENT: u8 = 0x02;

/// 客户端头
pub(crate) const C2S: u8 = 0x10;

/// 服务端头
pub(crate) const SERVER_BROADCAST: u8 = 0x11;
pub(crate) const SERVER_SINGLE: u8 = 0x12;
pub(crate) const SERVER_SINGLE_UUID: u8 = 0x13;
pub(crate) const SERVER_EXCLUDE: u8 = 0x14;
pub(crate) const SERVER_ACTION: u8 = 0xFF;

/// 中继控制命令
pub(crate) const KICK: u8 = 0x00;
pub(crate) const PERMIT: u8 = 0x01;
pub(crate) const QUERY: u8 = 0x02;
pub(crate) const BAN_IP: u8 = 0x03;
pub(crate) const UNBAN_IP: u8 = 0x04;

/// 中继回执,用于可翻译文本
pub(crate) const DUPLICATE_SERVER: u8 = 0x00;
pub(crate) const INVALID_REGISTER_PACKET: u8 = 0x01;
pub(crate) const DUPLICATE_PLAYER: u8 = 0x02;
pub(crate) const PACKET_TOO_LARGE: u8 = 0x03;

/// Server Only
pub(crate) const EXCLUDE_TOO_MUCH: u8 = 0x04;
pub(crate) const INVALID_ACTION: u8 = 0x05;
pub(crate) const EMPTY_SID: u8 = 0x06;
pub(crate) const KICKED: u8 = 0x07;
pub(crate) const BANED: u8 = 0x08;
pub(crate) const UNBAN: u8 = 0x09;
pub(crate) const DID_NOT_BANED: u8 = 0x10;
pub(crate) const INVALID_IPV4: u8 = 0x11;
pub(crate) const UNKNOWN_ACTION: u8 = 0xFF;
