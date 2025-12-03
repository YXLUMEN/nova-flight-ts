import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {Registries} from "../../../registry/Registries.ts";
import type {SoundEvent} from "../../../sound/SoundEvent.ts";

export class PlayAudioS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayAudioS2CPacket> = {id: Identifier.ofVanilla('play_audio')};

    public static readonly CODEC: PacketCodec<PlayAudioS2CPacket> = PacketCodecs.of<PlayAudioS2CPacket>(
        (writer, value) => {
            Identifier.PACKET_CODEC.encode(writer, value.audio.getId());
            writer.writeFloat(value.volume);
        },
        (reader) => {
            const id = Identifier.PACKET_CODEC.decode(reader);
            const sound = Registries.AUDIOS.getById(id)!;
            return new PlayAudioS2CPacket(sound, reader.readFloat());
        }
    );

    public readonly audio: SoundEvent;
    public readonly volume: number;

    public constructor(soundEvent: SoundEvent, volume: number) {
        this.audio = soundEvent;
        this.volume = volume;
    }

    public getId(): PayloadId<PlayAudioS2CPacket> {
        return PlayAudioS2CPacket.ID;
    }
}