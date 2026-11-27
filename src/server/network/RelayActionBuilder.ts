import {PacketHeader, ServerAction} from "../../network/PacketHeader.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";

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

    public static active_ack(sid: number, token: number) {
        const writer = new BinaryWriter(7);
        writer.writeInt8(PacketHeader.SERVER_ACTION);
        writer.writeInt8(ServerAction.ACTIVE_ACK);
        writer.writeInt8(sid);
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
        PacketCodecs.IPV4.encode(writer, ip);
        return writer.toUint8Array();
    }

    public static unbanIp(ip: string) {
        const writer = new BinaryWriter(6);
        writer.writeInt8(PacketHeader.SERVER_ACTION);
        writer.writeInt8(ServerAction.UNBAN_IP);
        PacketCodecs.IPV4.encode(writer, ip);
        return writer.toUint8Array();
    }
}