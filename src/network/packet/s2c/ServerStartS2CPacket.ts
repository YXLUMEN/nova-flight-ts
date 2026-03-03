import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ServerStartS2CPacket implements Payload {
    public static readonly ID: PayloadId<ServerStartS2CPacket> = payloadId('client_ready');
    public static readonly CODEC: PacketCodec<ServerStartS2CPacket> = PacketCodecs.emptyNew(ServerStartS2CPacket);

    public getId(): PayloadId<ServerStartS2CPacket> {
        return ServerStartS2CPacket.ID;
    }

    public canProcessInTransition(): boolean {
        return true;
    }
}