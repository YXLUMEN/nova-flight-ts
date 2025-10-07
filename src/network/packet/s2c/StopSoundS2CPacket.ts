import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import {Registries} from "../../../registry/Registries.ts";
import type {SoundEvent} from "../../../sound/SoundEvent.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class StopSoundS2CPacket implements Payload {
    public static readonly ID: PayloadId<StopSoundS2CPacket> = {id: Identifier.ofVanilla('stop_sound')};

    public static readonly CODEC: PacketCodec<StopSoundS2CPacket> = PacketCodec.of<StopSoundS2CPacket>(
        (value, writer) => {
            Identifier.PACKET_CODEC.encode(value.soundEvent.getId(), writer);
        },
        (reader) => {
            const id = Identifier.PACKET_CODEC.decode(reader);
            const sound = Registries.SOUND_EVENT.getById(id);
            if (!sound) {
                return new StopSoundS2CPacket(SoundEvents.UI_APPLY);
            }
            return new StopSoundS2CPacket(sound);
        }
    );

    public readonly soundEvent: SoundEvent;

    public constructor(soundEvent: SoundEvent) {
        this.soundEvent = soundEvent;
    }

    public getId(): PayloadId<StopSoundS2CPacket> {
        return StopSoundS2CPacket.ID;
    }
}