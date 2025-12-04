import type {Payload, PayloadId} from "../../Payload.ts";
import type {EntityAttributeInstance} from "../../../entity/attribute/EntityAttributeInstance.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import {EntityAttribute} from "../../../entity/attribute/EntityAttribute.ts";
import type {EntityAttributeModifier} from "../../../entity/attribute/EntityAttributeModifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {Registries} from "../../../registry/Registries.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityAttributesS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityAttributesS2CPacket> = {id: Identifier.ofVanilla('entity_attr')}
    public static readonly CODEC: PacketCodec<EntityAttributesS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.entityId);
            PacketCodecs.collection(Entry.CODEC).encode(writer, value.entries);
        },
        reader => {
            const entityId = reader.readVarUint();
            const list = PacketCodecs.collection(Entry.CODEC).decode(reader);
            return new EntityAttributesS2CPacket(entityId, list);
        }
    );

    public readonly entityId: number;
    public readonly entries: Entry[];

    public constructor(entityId: number, entries: Entry[]) {
        this.entityId = entityId;
        this.entries = entries;
    }

    public static create(entityId: number, attributes: Iterable<EntityAttributeInstance>): EntityAttributesS2CPacket {
        const entries: Entry[] = [];
        for (const entry of attributes) {
            entries.push(new Entry(
                entry.getAttribute(),
                entry.getBaseValue(),
                entry.getModifiers() as Set<EntityAttributeModifier>
            ));
        }

        return new EntityAttributesS2CPacket(entityId, entries);
    }

    public getId(): PayloadId<EntityAttributesS2CPacket> {
        return EntityAttributesS2CPacket.ID;
    }
}

class Entry {
    public static readonly MODIFIER_CODEC: PacketCodec<EntityAttributeModifier> = PacketCodecs.of(
        (writer, value) => {
            Identifier.PACKET_CODEC.encode(writer, value.id);
            writer.writeDouble(value.value);
        },
        reader => {
            return {
                id: Identifier.PACKET_CODEC.decode(reader),
                value: reader.readDouble()
            } satisfies EntityAttributeModifier;
        }
    );

    public static readonly CODEC: PacketCodec<Entry> = PacketCodecs.of(
        (writer, value) => {
            EntityAttribute.PACKET_CODEC.encode(writer, value.attribute.getValue());
            writer.writeDouble(value.base);
            PacketCodecs.collectionSet(Entry.MODIFIER_CODEC).encode(writer, value.modifiers);
        },
        reader => {
            const attr = EntityAttribute.PACKET_CODEC.decode(reader);
            const base = reader.readDouble();
            const set = PacketCodecs.collectionSet(Entry.MODIFIER_CODEC).decode(reader);
            return new Entry(Registries.ATTRIBUTE.getEntryByValue(attr)!, base, set);
        }
    );

    public readonly attribute: RegistryEntry<EntityAttribute>;
    public readonly base: number;
    public readonly modifiers: Set<EntityAttributeModifier>;

    public constructor(attribute: RegistryEntry<EntityAttribute>, base: number, modifiers: Set<EntityAttributeModifier>) {
        this.attribute = attribute;
        this.base = base;
        this.modifiers = modifiers;
    }
}