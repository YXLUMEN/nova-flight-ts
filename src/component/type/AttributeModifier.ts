import {Identifier} from "../../registry/Identifier.ts";
import type {Codec} from "../../serialization/Codec.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Codecs} from "../../serialization/Codecs.ts";

export const enum Operation {
    ADD,
    MULTIPLY,
}

export class AttributeModifier {
    public static readonly CODEC: Codec<AttributeModifier> = Codecs.group<AttributeModifier>(
        Codecs.field('id', Identifier.CODEC).for(val => val.id),
        Codecs.field('amount', Codecs.DOUBLE).for(val => val.amount),
        Codecs.field('operation', Codecs.INT8).for(val => val.operation),
    ).apply(AttributeModifier.new);

    public static readonly PACKET_CODEC: PacketCodec<AttributeModifier> = PacketCodecs.adapt3(
        Identifier.PACKET_CODEC,
        val => val.id,
        PacketCodecs.DOUBLE,
        val => val.amount,
        PacketCodecs.UINT8,
        val => val.operation,
        AttributeModifier.new
    );

    public static readonly DEFAULT = new AttributeModifier(
        Identifier.ofVanilla('default_attribute_component'),
        0,
        Operation.ADD
    );

    public readonly id: Identifier;
    public readonly amount: number;
    public readonly operation: Operation;

    public constructor(id: Identifier, amount: number, operation: Operation) {
        this.id = id;
        this.amount = amount;
        this.operation = operation;
    }

    public static new(id: Identifier, amount: number, operation: Operation) {
        return new AttributeModifier(id, amount, operation);
    }
}
