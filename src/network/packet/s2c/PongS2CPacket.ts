import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class PongS2CPacket implements Payload {
    public static readonly INSTANCE = new PongS2CPacket();
    public static readonly ID: PayloadType<PongS2CPacket> = payloadType('pong');
    public static readonly CODEC: PacketCodec<PongS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<PongS2CPacket> {
        return PongS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onPong(this);
    }

    public estimateSize(): number {
        return 0;
    }
}