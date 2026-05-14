import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class DifficultChangeS2CPacket implements Payload {
    public static readonly ID: PayloadType<DifficultChangeS2CPacket> = payloadType('difficult_change');
    public static readonly CODEC: PacketCodec<DifficultChangeS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.UINT8,
        val => val.difficult,
        val => new DifficultChangeS2CPacket(val),
    );

    public readonly difficult: number;

    public constructor(difficult: number) {
        this.difficult = difficult;
    }

    public type(): PayloadType<DifficultChangeS2CPacket> {
        return DifficultChangeS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onDifficultChange(this);
    }

    public estimateSize(): number {
        return 1;
    }
}