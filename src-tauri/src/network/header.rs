/// 连接注册
pub const REG_SERVER: u8 = 0x01;
pub const REG_CLIENT: u8 = 0x02;

pub const C2S: u8 = 0x10;

/// 服务端头
pub const SERVER_BROADCAST: u8 = 0x11;
pub const SERVER_SINGLE: u8 = 0x12;
pub const SERVER_SINGLE_UUID: u8 = 0x13;
pub const SERVER_EXCLUDE: u8 = 0x14;
pub const SERVER_ACTION: u8 = 0xFF;

/// 中继控制命令
pub const TICK: u8 = 0x00;
pub const PERMIT: u8 = 0x01;
pub const QUERY: u8 = 0x02;
