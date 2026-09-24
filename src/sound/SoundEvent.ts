import type {Identifier} from "../registry/Identifier.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Registries} from "../registry/Registries.ts";
import type {Comparable} from "../type/Comparable.ts";

export class SoundEvent implements Comparable {
    public static SOUND_PACKET_CODEC = PacketCodecs.registryValue(Registries.SOUND_EVENT);
    public static AUDIO_PACKET_CODEC = PacketCodecs.registryValue(Registries.AUDIOS);

    public readonly id: Identifier;

    public constructor(id: Identifier) {
        this.id = id;
    }

    public hashCode(): number {
        return this.id.hashCode();
    }

    public equals(other: unknown): boolean {
        if (other === this) return true;
        return other instanceof SoundEvent ? other.id.equals(this.id) : false;
    }
}