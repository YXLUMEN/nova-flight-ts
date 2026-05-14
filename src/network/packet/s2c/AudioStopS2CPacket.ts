import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class AudioStopS2CPacket implements Payload {
    public static readonly ID: PayloadType<AudioStopS2CPacket> = payloadType('audio_stop');
    public static readonly CODEC: PacketCodec<AudioStopS2CPacket> = PacketCodecs.adapt(
        SoundEvent.AUDIO_PACKET_CODEC,
        val => val.audio,
        val => new AudioStopS2CPacket(val),
    );

    public readonly audio: SoundEvent;

    public constructor(audio: SoundEvent) {
        this.audio = audio;
    }

    public type(): PayloadType<AudioStopS2CPacket> {
        return AudioStopS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler) {
        listener.onAudioStop(this);
    }

    public estimateSize(): number {
        return 4;
    }
}