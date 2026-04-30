import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class PongS2CPacket implements Payload {
    public static readonly INSTANCE = new PongS2CPacket();
    public static readonly ID: PayloadId<PongS2CPacket> = payloadId('pong');
    public static readonly CODEC: PacketCodec<PongS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public getId(): PayloadId<PongS2CPacket> {
        return PongS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onPong(this);
    }

    public estimateSize(): number {
        return 0;
    }
}