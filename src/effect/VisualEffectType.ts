import type {VisualEffect} from "./VisualEffect.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import type {Constructor} from "../apis/registry.ts";


export class VisualEffectType<T extends VisualEffect, F extends Constructor<T> = Constructor<T>> {
    public readonly codec: PacketCodec<T>;
    private readonly effect: F;

    public constructor(effect: F, codec: PacketCodec<T>) {
        this.effect = effect;
        this.codec = codec;
    }

    public static create<T extends VisualEffect>(effect: Constructor<T>, codec: PacketCodec<T>): VisualEffectType<T> {
        return new VisualEffectType(effect, codec);
    }

    public create(...args: ConstructorParameters<F>): T {
        return new this.effect(...args);
    }
}