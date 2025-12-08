import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class SoundEventS2CPacket implements Payload {
    public static readonly ID: PayloadId<SoundEventS2CPacket> = {id: Identifier.ofVanilla('sound_event')};

    public static readonly CODEC: PacketCodec<SoundEventS2CPacket> = PacketCodecs.of<SoundEventS2CPacket>(
        (writer, value) => {
            SoundEvent.SOUND_PACKET_CODEC.encode(writer, value.soundEvent);
            writer.writeFloat(value.volume);
            writer.writeFloat(value.pitch);
            writer.writeInt8(value.loop ? 1 : 0);
        },
        (reader) => {
            const sound = SoundEvent.SOUND_PACKET_CODEC.decode(reader);
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