import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PingC2SPacket implements Payload {
    public static readonly INSTANCE = new PingC2SPacket();
    public static readonly ID: PayloadId<PingC2SPacket> = payloadId('ping');
    public static readonly CODEC: PacketCodec<PingC2SPacket> = PacketCodecs.emptyNew(PingC2SPacket);

    public getId(): PayloadId<PingC2SPacket> {
        return PingC2SPacket.ID;
    }
}