import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerCommonHandler} from "../../../server/network/handler/ServerCommonHandler.ts";

export class PingC2SPacket implements Payload {
    public static readonly INSTANCE = new PingC2SPacket();
    public static readonly ID: PayloadId<PingC2SPacket> = payloadId('ping');
    public static readonly CODEC: PacketCodec<PingC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public getId(): PayloadId<PingC2SPacket> {
        return PingC2SPacket.ID;
    }

    public accept(listener: ServerCommonHandler): void {
        listener.onPing();
    }

    public estimateSize(): number {
        return 0;
    }
}