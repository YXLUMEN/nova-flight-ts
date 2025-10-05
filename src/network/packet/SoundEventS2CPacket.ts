import type {Payload} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {PacketCodec} from "../codec/PacketCodec.ts";
import type {SoundEvent} from "../../sound/SoundEvent.ts";
import {Registries} from "../../registry/Registries.ts";

export class SoundEventS2CPacket implements Payload {
    public static readonly ID = Identifier.ofVanilla('sound_event');

    public static readonly CODEC: PacketCodec<SoundEventS2CPacket> = PacketCodec.of<SoundEventS2CPacket>(
        (value, writer) => {
            Identifier.PACKET_CODEC.encode(value.getId(), writer);
            writer.writeFloat(value.volume);
            writer.writeFloat(value.pitch);
        },
        (reader) => {
            const id = Identifier.PACKET_CODEC.decode(reader);
            const sound = Registries.SOUND_EVENT.getById(id)!;
            return new SoundEventS2CPacket(sound, reader.readFloat(), reader.readFloat());
        }
    );

    public readonly soundEvent: SoundEvent;
    public readonly volume: number;
    public readonly pitch: number;

    public constructor(soundEvent: SoundEvent, volume: number, pitch: number) {
        this.soundEvent = soundEvent;
        this.volume = volume;
        this.pitch = pitch;
    }

    public getId(): Identifier {
        return SoundEventS2CPacket.ID;
    }
}