import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";

export class PlayAudioS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayAudioS2CPacket> = payloadId('play_audio');
    public static readonly CODEC: PacketCodec<PlayAudioS2CPacket> = PacketCodecs.adapt3(
        SoundEvent.AUDIO_PACKET_CODEC,
        val => val.audio,
        PacketCodecs.FLOAT,
        val => val.volume,
        PacketCodecs.BOOL,
        val => val.loop,
        PlayAudioS2CPacket.new
    );

    public readonly audio: SoundEvent;
    public readonly volume: number;
    public readonly loop: boolean;

    public constructor(soundEvent: SoundEvent, volume: number, loop: boolean = false) {
        this.audio = soundEvent;
        this.volume = volume;
        this.loop = loop;
    }

    public static new(soundEvent: SoundEvent, volume: number, loop: boolean = false): PlayAudioS2CPacket {
        return new PlayAudioS2CPacket(soundEvent, volume, loop);
    }

    public getId(): PayloadId<PlayAudioS2CPacket> {
        return PlayAudioS2CPacket.ID;
    }
}