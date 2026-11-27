export const enum PacketHeader {
    RELAY = 0x00,
    SERVER = 0x01,
    CLIENT = 0x02,
    C2S = 0x10,
    SERVER_BROADCAST = 0x11,
    SERVER_SINGLE = 0x12,
    // 对客户端无意义,中继修改为广播
    SERVER_EXCLUDE = 0x13,
    SERVER_ACTION = 0xFF,
}

export const enum ServerAction {
    KICK = 0x00,
    PERMIT = 0x01,
    REJECT = 0x02,
    ACTIVE_ACK = 0x03,
    QUERY = 0x04,
    BAN_IP = 0x05,
    UNBAN_IP = 0x06,
    ACCEPT_CONN = 0x07,
}