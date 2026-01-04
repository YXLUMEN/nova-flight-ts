import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ServerReadyS2CPacket implements Payload {
    public static readonly ID: PayloadId<ServerReadyS2CPacket> = payloadId('server_ready');
    public static readonly CODEC: PacketCodec<ServerReadyS2CPacket> = PacketCodecs.emptyNew(ServerReadyS2CPacket);

    public getId(): PayloadId<ServerReadyS2CPacket> {
        return ServerReadyS2CPacket.ID;
    }
}