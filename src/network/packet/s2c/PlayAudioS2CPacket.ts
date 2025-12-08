import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";

export class PlayAudioS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayAudioS2CPacket> = {id: Identifier.ofVanilla('play_audio')};
    public static readonly CODEC: PacketCodec<PlayAudioS2CPacket> = PacketCodecs.adapt2(
        SoundEvent.AUDIO_PACKET_CODEC,
        val => val.audio,
        PacketCodecs.FLOAT,
        val => val.volume,
        PlayAudioS2CPacket.new
    );

    public readonly audio: SoundEvent;
    public readonly volume: number;

    public constructor(soundEvent: SoundEvent, volume: number) {
        this.audio = soundEvent;
        this.volume = volume;
    }

    public static new(soundEvent: SoundEvent, volume: number) {
        return new PlayAudioS2CPacket(soundEvent, volume);
    }

    public getId(): PayloadId<PlayAudioS2CPacket> {
        return PlayAudioS2CPacket.ID;
    }
}