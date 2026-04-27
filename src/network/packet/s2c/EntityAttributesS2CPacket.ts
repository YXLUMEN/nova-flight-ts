import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {AttributeInstance} from "../../../entity/attribute/AttributeInstance.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import {EntityAttribute} from "../../../entity/attribute/EntityAttribute.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {Registries} from "../../../registry/Registries.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {createClean} from "../../../utils/uit.ts";
import type {AttributeModifier} from "../../../component/type/AttributeModifier.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

class Entry {
    public static readonly MODIFIER_CODEC: PacketCodec<AttributeModifier> = PacketCodecs.of(
        (writer, value) => {
            Identifier.PACKET_CODEC.encode(writer, value.id);
            writer.writeDouble(value.value);
        },
        reader => {
            return createClean({
                id: Identifier.PACKET_CODEC.decode(reader),
                value: reader.readDouble()
            }) satisfies AttributeModifier;
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
    public readonly modifiers: Set<AttributeModifier>;

    public constructor(attribute: RegistryEntry<EntityAttribute>, base: number, modifiers: Set<AttributeModifier>) {
        this.attribute = attribute;
        this.base = base;
        this.modifiers = modifiers;
    }
}

export class EntityAttributesS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityAttributesS2CPacket> = payloadId('entity_attr');
    public static readonly CODEC: PacketCodec<EntityAttributesS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.collection(Entry.CODEC),
        val => val.entries,
        EntityAttributesS2CPacket.new
    );

    public readonly entityId: number;
    public readonly entries: Entry[];

    public constructor(entityId: number, entries: Entry[]) {
        this.entityId = entityId;
        this.entries = entries;
    }

    public static new(entityId: number, entries: Entry[]) {
        return new EntityAttributesS2CPacket(entityId, entries);
    }

    public static create(entityId: number, attributes: Iterable<AttributeInstance>): EntityAttributesS2CPacket {
        const entries: Entry[] = [];
        for (const entry of attributes) {
            entries.push(new Entry(
                entry.getAttribute(),
                entry.getBaseValue(),
                entry.getModifiers() as Set<AttributeModifier>
            ));
        }

        return new EntityAttributesS2CPacket(entityId, entries);
    }

    public getId(): PayloadId<EntityAttributesS2CPacket> {
        return EntityAttributesS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onEntityAttributes(this);
    }
}
