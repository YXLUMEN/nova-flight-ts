import type {Codec} from "../serialization/Codec.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Registries} from "../registry/Registries.ts";

export class DataComponentType<T> {
    public static readonly PACKET_CODEC: PacketCodec<DataComponentType<any>> = PacketCodecs.registryValue(Registries.DATA_COMPONENT_TYPE);

    public readonly codec: Codec<T> | null;
    public readonly packetCodec: PacketCodec<T>;

    public constructor(builder: ComponentTypeBuilder<T>) {
        this.codec = builder.codec;
        this.packetCodec = builder.packetCodec!;
        Object.freeze(this);
    }

    public isTransient() {
        return this.codec === null;
    }
}

export class ComponentTypeBuilder<T> {
    public codec: Codec<T> | null = null;
    public packetCodec: PacketCodec<T> | null = null;

    public persistent(codec: Codec<T>): this {
        this.codec = codec;
        return this;
    }

    public network(packetCodec: PacketCodec<T>): this {
        this.packetCodec = packetCodec;
        return this;
    }

    public build(): DataComponentType<T> {
        if (!this.packetCodec) {
            if (!this.codec) throw new Error("Missing Codec for component");
            this.packetCodec = PacketCodecs.registryCodec(this.codec);
        }
        return new DataComponentType<T>(this);
    }
}