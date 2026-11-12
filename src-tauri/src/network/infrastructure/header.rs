/// 连接注册
pub const REG_SERVER: u8 = 0x01;
pub const REG_CLIENT: u8 = 0x02;

/// 客户端头
pub const C2S: u8 = 0x10;

/// 服务端头
pub const SERVER_BROADCAST: u8 = 0x11;
pub const SERVER_SINGLE: u8 = 0x12;
pub const SERVER_SINGLE_UUID: u8 = 0x13;
pub const SERVER_EXCLUDE: u8 = 0x14;
pub const SERVER_ACTION: u8 = 0xFF;

/// 中继控制命令
pub const KICK: u8 = 0x00;
pub const PERMIT: u8 = 0x01;
pub const QUERY: u8 = 0x02;
pub const BAN_IP: u8 = 0x03;
pub const UNBAN_IP: u8 = 0x04;

/// 中继回执,用于可翻译文本
pub const DUPLICATE_SERVER: u8 = 0x00;
pub const INVALID_REGISTER_PACKET: u8 = 0x01;
pub const DUPLICATE_PLAYER: u8 = 0x02;
pub const PACKET_TOO_LARGE: u8 = 0x03;

/// Server Only
pub const EXCLUDE_TOO_MUCH: u8 = 0x04;
pub const INVALID_ACTION: u8 = 0x05;
pub const EMPTY_SID: u8 = 0x06;
pub const KICKED: u8 = 0x07;
pub const BANED: u8 = 0x08;
pub const UNBAN: u8 = 0x09;
pub const DID_NOT_BANED: u8 = 0x10;
pub const INVALID_IPV4: u8 = 0x11;
pub const UNKNOWN_ACTION: u8 = 0xFF;
