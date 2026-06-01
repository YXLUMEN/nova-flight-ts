import {Identifier} from "../../registry/Identifier.ts";
import type {Codec} from "../../serialization/Codec.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Codecs} from "../../serialization/Codecs.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";

export const enum Operation {
    ADD,
    MULTIPLY,
}

export class AttributeModifier {
    public static readonly CODEC: Codec<AttributeModifier> = Codecs.of(
        value => {
            const compound = new NbtCompound();
            compound.set('id', Identifier.CODEC.encode(value.id));
            compound.setDouble('amount', value.amount);
            compound.setInt8('operation', value.operation);
            return compound;
        },
        nbt => {
            const nbtString = nbt.contains('id', NbtTypeId.String);
            if (!nbtString) return null;

            const id = Identifier.CODEC.decode(nbt.get('id')!);
            if (!id) return null;

            const operation = nbt.getInt8('operation', Operation.ADD);
            if (operation !== Operation.ADD && operation !== Operation.MULTIPLY) return null;

            return new AttributeModifier(id, nbt.getDouble('amount'), operation);
        },
    );

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
