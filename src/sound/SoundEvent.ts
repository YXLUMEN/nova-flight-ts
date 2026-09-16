import type {Identifier} from "../registry/Identifier.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Registries} from "../registry/Registries.ts";

export class SoundEvent {
    public static SOUND_PACKET_CODEC = PacketCodecs.registryValue(Registries.SOUND_EVENT);
    public static AUDIO_PACKET_CODEC = PacketCodecs.registryValue(Registries.AUDIOS);

    public readonly id: Identifier;

    public constructor(id: Identifier) {
        this.id = id;
    }
}