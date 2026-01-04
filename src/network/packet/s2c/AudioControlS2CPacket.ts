import {payloadId, type Payload, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class AudioControlS2CPacket implements Payload {
    public static readonly ID: PayloadId<AudioControlS2CPacket> = payloadId('audio_control');
    public static readonly CODEC: PacketCodec<AudioControlS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.UINT8,
        val => val.action,
        to => new AudioControlS2CPacket(to)
    );

    public readonly action: number

    public constructor(action: number) {
        this.action = action;
    }

    public getId(): PayloadId<AudioControlS2CPacket> {
        return AudioControlS2CPacket.ID;
    }
}