import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class NotGiveUpS2CPacket implements Payload {
    public static readonly INSTANCE = new NotGiveUpS2CPacket();
    public static readonly ID: PayloadType<NotGiveUpS2CPacket> = payloadType('not_give_up');
    public static readonly CODEC: PacketCodec<NotGiveUpS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<NotGiveUpS2CPacket> {
        return NotGiveUpS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onNGU(this);
    }
}