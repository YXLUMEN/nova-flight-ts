import type {Payload} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {PacketCodec} from "../codec/PacketCodec.ts";
import {Registries} from "../../registry/Registries.ts";
import type {SoundEvent} from "../../sound/SoundEvent.ts";

export class StopSoundS2CPacket implements Payload {
    public static readonly ID = Identifier.ofVanilla('stop_sound');

    public static readonly CODEC: PacketCodec<StopSoundS2CPacket> = PacketCodec.of<StopSoundS2CPacket>(
        (value, writer) => {
            Identifier.PACKET_CODEC.encode(value.getId(), writer);
        },
        (reader) => {
            const id = Identifier.PACKET_CODEC.decode(reader);
            const sound = Registries.SOUND_EVENT.getById(id)!;
            return new StopSoundS2CPacket(sound);
        }
    );

    public readonly soundEvent: SoundEvent;

    public constructor(soundEvent: SoundEvent) {
        this.soundEvent = soundEvent;
    }

    public getId(): Identifier {
        return StopSoundS2CPacket.ID;
    }
}