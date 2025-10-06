import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {SoundEvent} from "../../../sound/SoundEvent.ts";
import {Registries} from "../../../registry/Registries.ts";

export class SoundEventS2CPacket implements Payload {
    public static readonly ID: PayloadId<SoundEventS2CPacket> = {id: Identifier.ofVanilla('sound_event')};

    public static readonly CODEC: PacketCodec<SoundEventS2CPacket> = PacketCodec.of<SoundEventS2CPacket>(
        (value, writer) => {
            Identifier.PACKET_CODEC.encode(value.getId().id, writer);
            writer.writeFloat(value.volume);
            writer.writeFloat(value.pitch);
            writer.writeInt8(value.loop ? 1 : 0);
        },
        (reader) => {
            const id = Identifier.PACKET_CODEC.decode(reader);
            const sound = Registries.SOUND_EVENT.getById(id)!;
            return new SoundEventS2CPacket(sound, reader.readFloat(), reader.readFloat(), reader.readInt8() === 1);
        }
    );

    public readonly soundEvent: SoundEvent;
    public readonly volume: number;
    public readonly pitch: number;
    public readonly loop: boolean;

    public constructor(soundEvent: SoundEvent, volume: number, pitch: number, loop: boolean) {
        this.soundEvent = soundEvent;
        this.volume = volume;
        this.pitch = pitch;
        this.loop = loop;
    }

    public getId(): PayloadId<SoundEventS2CPacket> {
        return SoundEventS2CPacket.ID;
    }
}