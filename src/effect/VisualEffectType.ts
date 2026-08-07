import type {VisualEffect} from "./VisualEffect.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Registries} from "../registry/Registries.ts";


export class VisualEffectType<T extends VisualEffect> {
    public static readonly PACKET_CODEC: PacketCodec<VisualEffectType<any>> = PacketCodecs.registryValue(Registries.EFFECT_TYPE);
    public readonly codec: PacketCodec<T>;

    public constructor(codec: PacketCodec<T>) {
        this.codec = codec;
    }

    public static create<T extends VisualEffect>(codec: PacketCodec<T>): VisualEffectType<T> {
        return new VisualEffectType(codec);
    }
}