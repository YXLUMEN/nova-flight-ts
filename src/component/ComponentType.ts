import type {Codec} from "../network/codec/Codec.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";

export class ComponentType<T> {
    public readonly codec: Codec<T>
    public readonly packetCodec: PacketCodec<T>;

    public constructor(builder: ComponentTypeBuilder<T>) {
        this.codec = builder.codec;
        this.packetCodec = builder.packetCodec;
    }

    public static builder<T>() {
        return new ComponentTypeBuilder<T>();
    }
}

export class ComponentTypeBuilder<T> {
    public codec!: Codec<T>;
    public packetCodec!: PacketCodec<T>;

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