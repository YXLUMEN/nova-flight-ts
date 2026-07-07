import {PacketHeader, ServerAction} from "../../network/PacketHeader.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {encodeIpv4} from "../../utils/NetUtil.ts";

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

    public static queryClients() {
        const buf = new Uint8Array(2);
        buf[0] = PacketHeader.SERVER_ACTION;
        buf[1] = ServerAction.QUERY;
        return buf;
    }

    public static banIp(ip: string) {
        const writer = new BinaryWriter(6);
        writer.writeInt8(PacketHeader.SERVER_ACTION);
        writer.writeInt8(ServerAction.BAN);
        writer.writeUint32(encodeIpv4(ip));
        return writer.toUint8Array();
    }

    public static unbanIp(ip: string) {
        const writer = new BinaryWriter(6);
        writer.writeInt8(PacketHeader.SERVER_ACTION);
        writer.writeInt8(ServerAction.UNBAN);
        writer.writeUint32(encodeIpv4(ip));
        return writer.toUint8Array();
    }
}