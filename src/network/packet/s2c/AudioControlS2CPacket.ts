import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
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
    public readonly leap: number;

    public constructor(action: number, leap: number = 0) {
        this.action = action;
        this.leap = leap;
    }

    public getId(): PayloadId<AudioControlS2CPacket> {
        return AudioControlS2CPacket.ID;
    }
}

export class AudioLeapS2CPacket extends AudioControlS2CPacket {
    public static readonly ID: PayloadId<AudioLeapS2CPacket> = payloadId('audio_leap');
    public static readonly CODEC: PacketCodec<AudioLeapS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.FLOAT,
        val => val.leap,
        to => new AudioLeapS2CPacket(to)
    );

    public constructor(leap: number) {
        super(4, leap);
    }

    public getId(): PayloadId<AudioLeapS2CPacket> {
        return AudioLeapS2CPacket.ID;
    }
}