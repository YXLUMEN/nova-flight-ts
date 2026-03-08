export class RelayActionBuilder {
    public static forceDisconnect(sessionId: number) {
        const buf = new Uint8Array(3);
        buf[0] = 0xFF;
        buf[1] = 0x00;
        buf[2] = sessionId & 0xFF;
        return buf;
    }

    public static allowTraffic(sessionId: number) {
        const buf = new Uint8Array(3);
        buf[0] = 0xFF;
        buf[1] = 0x01;
        buf[2] = sessionId & 0xFF;
        return buf;
    }
}