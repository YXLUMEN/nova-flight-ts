import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class TickChangeS2CPacket implements Payload {
    public static readonly ID: PayloadType<TickChangeS2CPacket> = payloadType('tick_change');
    public static readonly CODEC: PacketCodec<TickChangeS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.INT8,
        val => val.rate,
        val => new TickChangeS2CPacket(val)
    );

    public readonly rate: number;

    public constructor(rate: number) {
        this.rate = rate;
    }

    public type(): PayloadType<TickChangeS2CPacket> {
        return TickChangeS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onTickChange(this);
    }
}
