import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class StopSoundS2CPacket implements Payload {
    public static readonly ID: PayloadId<StopSoundS2CPacket> = {id: Identifier.ofVanilla('stop_sound')};
    public static readonly CODEC: PacketCodec<StopSoundS2CPacket> = PacketCodecs.adapt(
        SoundEvent.SOUND_PACKET_CODEC,
        val => val.soundEvent,
        val => new StopSoundS2CPacket(val)
    );

    public readonly soundEvent: SoundEvent;

    public constructor(soundEvent: SoundEvent) {
        this.soundEvent = soundEvent;
    }

    public getId(): PayloadId<StopSoundS2CPacket> {
        return StopSoundS2CPacket.ID;
    }
}