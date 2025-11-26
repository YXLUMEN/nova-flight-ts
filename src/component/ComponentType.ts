import type {Codec} from "../serialization/Codec.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Registries} from "../registry/Registries.ts";

export class ComponentType<T> {
    public static readonly PACKET_CODEC: PacketCodec<ComponentType<any>> = PacketCodecs.registryEntry(Registries.DATA_COMPONENT_TYPE);

    public readonly codec: Codec<T>
    public readonly packetCodec: PacketCodec<T>;

    public constructor(builder: ComponentTypeBuilder<T>) {
        this.codec = builder.codec!;
        this.packetCodec = builder.packetCodec!;
    }

    public static builder<T>() {
        return new ComponentTypeBuilder<T>();
    }
}

export class ComponentTypeBuilder<T> {
    public codec: Codec<T> | null = null;
    public packetCodec: PacketCodec<T> | null = null;

    public withCodec(codec: Codec<T>): this {
        this.codec = codec;
        return this;
    }

    public withPacketCodec(packetCodec: PacketCodec<T>): this {
        this.packetCodec = packetCodec;
        return this;
    }

    public build(): ComponentType<T> {
        if (!this.codec || !this.packetCodec) {
            throw new Error("Missing Codec for component");
        }
        return new ComponentType<T>(this);
    }
}