import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PongS2CPacket implements Payload {
    public static readonly ID: PayloadId<PongS2CPacket> = payloadId('pong');
    public static readonly CODEC: PacketCodec<PongS2CPacket> = PacketCodecs.emptyNew(PongS2CPacket);

    public getId(): PayloadId<PongS2CPacket> {
        return PongS2CPacket.ID;
    }
}