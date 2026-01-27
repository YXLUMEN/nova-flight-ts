import type {Constructor} from "../../apis/types.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Registries} from "../../registry/Registries.ts";
import type {WorldEvent} from "./WorldEvent.ts";

export class WorldEventType<T extends WorldEvent, F extends Constructor<T> = Constructor<T>> {
    public static readonly PACKET_CODEC: PacketCodec<WorldEventType<any>> = PacketCodecs.registryValue(Registries.WORLD_EVENT);
    public readonly codec: PacketCodec<T>;
    private readonly effect: F;

    public constructor(effect: F, codec: PacketCodec<T>) {
        this.effect = effect;
        this.codec = codec;
    }

    public static create<T extends WorldEvent>(effect: Constructor<T>, codec: PacketCodec<T>): WorldEventType<T> {
        return new WorldEventType<T>(effect, codec);
    }

    public create(...args: ConstructorParameters<F>): T {
        return new this.effect(...args);
    }
}