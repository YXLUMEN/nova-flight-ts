import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class AudioControlS2CPacket implements Payload {
    public static readonly ID: PayloadType<AudioControlS2CPacket> = payloadType('audio_control');
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

    public type(): PayloadType<AudioControlS2CPacket> {
        return AudioControlS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler) {
        listener.onAudioControl(this);
    }

    public estimateSize(): number {
        return 1;
    }
}

export class AudioLeapS2CPacket extends AudioControlS2CPacket {
    public static readonly ID: PayloadType<AudioLeapS2CPacket> = payloadType('audio_leap');
    public static readonly CODEC: PacketCodec<AudioLeapS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.FLOAT,
        val => val.leap,
        to => new AudioLeapS2CPacket(to)
    );

    public constructor(leap: number) {
        super(4, leap);
    }

    public type(): PayloadType<AudioLeapS2CPacket> {
        return AudioLeapS2CPacket.ID;
    }

    public estimateSize(): number {
        return 4;
    }
}