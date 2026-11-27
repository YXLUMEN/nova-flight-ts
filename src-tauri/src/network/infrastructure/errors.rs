use log::Level;
use std::fmt;

#[derive(Debug, Clone, Copy)]
pub(crate) enum RegisterError {
    // 对端可控
    Timeout,
    ChannelClosed,
    NotRegisterPacket,
    EmptyPacket,
    InvalidPacket,
    UuidNil,
    ServerNotExist,
    // 正常业务拒绝
    DuplicateClient,
    DuplicateServer,
    SecretMismatch,
    SecretBurnout,
    // 违反内部不变量
    Internal(&'static str),
}

impl RegisterError {
    pub fn level(self) -> Level {
        use RegisterError::*;
        match self {
            Timeout | ChannelClosed | NotRegisterPacket | EmptyPacket | InvalidPacket | UuidNil
            | ServerNotExist | SecretBurnout => Level::Debug,
            DuplicateClient => Level::Info,
            DuplicateServer | SecretMismatch => Level::Warn,
            Internal(_) => Level::Error,
        }
    }
}

impl fmt::Display for RegisterError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use RegisterError::*;
        f.write_str(match *self {
            Timeout => "registry timeout",
            ChannelClosed => "channel closed",
            NotRegisterPacket => "not a register packet",
            EmptyPacket => "empty register packet",
            InvalidPacket => "invalid register packet",
            UuidNil => "client uuid is nil",
            ServerNotExist => "server not exist",
            DuplicateClient => "duplicate client uuid",
            DuplicateServer => "server already exists",
            SecretMismatch => "server secret mismatch",
            SecretBurnout => "server secret burnout",
            Internal(msg) => msg,
        })
    }
}
