import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class DifficultChangeS2CPacket implements Payload {
    public static readonly ID: PayloadId<DifficultChangeS2CPacket> = payloadId('difficult_change');
    public static readonly CODEC: PacketCodec<DifficultChangeS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.UINT8,
        val => val.difficult,
        val => new DifficultChangeS2CPacket(val),
    );

    public readonly difficult: number;

    public constructor(difficult: number) {
        this.difficult = difficult;
    }

    public getId(): PayloadId<DifficultChangeS2CPacket> {
        return DifficultChangeS2CPacket.ID;
    }
}