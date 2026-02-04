import type {EntityAttributeModifier} from "../../entity/attribute/EntityAttributeModifier.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {Codec} from "../../serialization/Codec.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Codecs} from "../../serialization/Codecs.ts";
import {NbtDouble} from "../../nbt/element/NbtDouble.ts";

export class AttributeModifiersComponent implements EntityAttributeModifier {
    public static readonly CODEC: Codec<AttributeModifiersComponent> = Codecs.of(
        value => NbtDouble.of(value.value),
        nbt => {
            const id = Identifier.CODEC.decode(nbt);
            if (!id) return null;
            return new AttributeModifiersComponent(id, nbt.value);
        },
    );

    public static readonly PACKET_CODEC: PacketCodec<AttributeModifiersComponent> = PacketCodecs.adapt2(
        Identifier.PACKET_CODEC,
        val => val.id,
        PacketCodecs.DOUBLE,
        val => val.value,
        AttributeModifiersComponent.new
    );

    public static readonly DEFAULT = new AttributeModifiersComponent(
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
        return new AttributeModifiersComponent(id, value);
    }
}