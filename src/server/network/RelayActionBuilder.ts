import {PacketHeader, ServerAction} from "../../network/PacketHeader.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {encodeIpv4} from "../../utils/net_util.ts";

export class RelayActionBuilder {
    public static forceDisconnect(sid: number) {
        const buf = new Uint8Array(3);
        buf[0] = PacketHeader.SERVER_ACTION;
        buf[1] = ServerAction.KICK;
        buf[2] = sid & 0xFF;
        return buf;
    }

    public static permit(token: number) {
        const writer = new BinaryWriter(6);
        writer.writeInt8(PacketHeader.SERVER_ACTION);
        writer.writeInt8(ServerAction.PERMIT);
        writer.writeUint32(token);
        return writer.toUint8Array();
    }

    public static reject(token: number) {
        const writer = new BinaryWriter(6);
        writer.writeInt8(PacketHeader.SERVER_ACTION);
        writer.writeInt8(ServerAction.REJECT);
        writer.writeUint32(token);
        return writer.toUint8Array();
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
        writer.writeInt8(ServerAction.BAN_IP);
        writer.writeUint32(encodeIpv4(ip));
        return writer.toUint8Array();
    }

    public static unbanIp(ip: string) {
        const writer = new BinaryWriter(6);
        writer.writeInt8(PacketHeader.SERVER_ACTION);
        writer.writeInt8(ServerAction.UNBAN_IP);
        writer.writeUint32(encodeIpv4(ip));
        return writer.toUint8Array();
    }
}