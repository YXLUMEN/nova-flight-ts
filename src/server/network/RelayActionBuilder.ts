import {PacketHeader, ServerAction} from "../../network/PacketHeader.ts";

export class RelayActionBuilder {
    public static forceDisconnect(sessionId: number) {
        const buf = new Uint8Array(3);
        buf[0] = PacketHeader.SERVER_ACTION;
        buf[1] = ServerAction.TICK;
        buf[2] = sessionId & 0xFF;
        return buf;
    }

    public static allowTraffic(sessionId: number) {
        const buf = new Uint8Array(3);
        buf[0] = PacketHeader.SERVER_ACTION;
        buf[1] = ServerAction.PERMIT;
        buf[2] = sessionId & 0xFF;
        return buf;
    }
}