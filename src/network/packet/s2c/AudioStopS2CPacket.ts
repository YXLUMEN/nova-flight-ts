import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class AudioStopS2CPacket implements Payload {
    public static readonly ID: PayloadId<AudioStopS2CPacket> = payloadId('audio_stop');
    public static readonly CODEC: PacketCodec<AudioStopS2CPacket> = PacketCodecs.adapt(
        SoundEvent.AUDIO_PACKET_CODEC,
        val => val.audio,
        val => new AudioStopS2CPacket(val),
    );

    public readonly audio: SoundEvent;

    public constructor(audio: SoundEvent) {
        this.audio = audio;
    }

    public getId(): PayloadId<AudioStopS2CPacket> {
        return AudioStopS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler) {
        listener.onAudioStop(this);
    }
}