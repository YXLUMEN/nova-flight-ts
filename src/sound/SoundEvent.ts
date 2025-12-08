import type {Identifier} from "../registry/Identifier.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Registries} from "../registry/Registries.ts";

export class SoundEvent {
    public static SOUND_PACKET_CODEC = PacketCodecs.registryValue(Registries.SOUND_EVENT);
    public static AUDIO_PACKET_CODEC = PacketCodecs.registryValue(Registries.AUDIOS);

    private readonly id: Identifier;
    // private readonly distanceToTravel: number;
    // private readonly staticDistance: boolean;

    private constructor(id: Identifier) {
        this.id = id;
    }

    public static of(id: Identifier): SoundEvent {
        return new SoundEvent(id);
    }

    public getId(): Identifier {
        return this.id;
    }
}