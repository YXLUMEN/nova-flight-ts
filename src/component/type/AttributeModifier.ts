import {Identifier} from "../../registry/Identifier.ts";
import type {Codec} from "../../serialization/Codec.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Codecs} from "../../serialization/Codecs.ts";
import {NbtDouble} from "../../nbt/element/NbtDouble.ts";

export class AttributeModifier {
    public static readonly CODEC: Codec<AttributeModifier> = Codecs.of(
        value => NbtDouble.of(value.value),
        nbt => {
            const id = Identifier.CODEC.decode(nbt);
            if (!id) return null;
            return new AttributeModifier(id, nbt.value);
        },
    );

    public static readonly PACKET_CODEC: PacketCodec<AttributeModifier> = PacketCodecs.adapt2(
        Identifier.PACKET_CODEC,
        val => val.id,
        PacketCodecs.DOUBLE,
        val => val.value,
        AttributeModifier.new
    );

    public static readonly DEFAULT = new AttributeModifier(
        Identifier.ofVanilla('default_attribute_component'),
        0
    );

    public id: Identifier;
    public value: number;

    public constructor(id: Identifier, value: number) {
        this.id = id;
        this.value = value;
    }

    public static new(id: Identifier, value: number) {
        return new AttributeModifier(id, value);
    }
}