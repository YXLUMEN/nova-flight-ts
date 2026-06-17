export const enum PacketHeader {
    RELAY = 0x00,
    SERVER = 0x01,
    CLIENT = 0x02,
    C2S = 0x10,
    SERVER_BROADCAST = 0x11,
    SERVER_SINGLE = 0x12,
    SERVER_SINGLE_UUID = 0x13,
    SERVER_EXCLUDE = 0x14,
    SERVER_ACTION = 0xFF,
}

export const enum ServerAction {
    TICK = 0x00,
    PERMIT = 0x01,
    QUERY = 0x02,
}