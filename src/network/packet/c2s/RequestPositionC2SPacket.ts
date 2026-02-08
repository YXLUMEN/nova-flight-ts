import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class RequestPositionC2SPacket implements Payload {
    public static readonly INSTANCE = new RequestPositionC2SPacket();
    public static readonly ID: PayloadId<RequestPositionC2SPacket> = payloadId('request_position');
    public static readonly CODEC: PacketCodec<RequestPositionC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    public getId(): PayloadId<RequestPositionC2SPacket> {
        return RequestPositionC2SPacket.ID;
    }
}