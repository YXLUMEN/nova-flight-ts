import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {AttributeInstance} from "../../../entity/attribute/AttributeInstance.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import {Attribute} from "../../../entity/attribute/Attribute.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {Registries} from "../../../registry/Registries.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {AttributeModifier} from "../../../component/type/AttributeModifier.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

class AttrEntry {
    public static readonly PACKET_CODEC: PacketCodec<AttrEntry> = PacketCodecs.of(
        (writer, value) => {
            Attribute.PACKET_CODEC.encode(writer, value.attribute.getValue());
            writer.writeDouble(value.base);
            PacketCodecs.collectionSet(AttributeModifier.PACKET_CODEC).encode(writer, value.modifiers);
        },
        reader => {
            const attr = Attribute.PACKET_CODEC.decode(reader);
            const base = reader.readDouble();
            const set = PacketCodecs.collectionSet(AttributeModifier.PACKET_CODEC).decode(reader);
            return new AttrEntry(Registries.ATTRIBUTE.getEntryByValue(attr)!, base, set);
        }
    );

    public readonly attribute: RegistryEntry<Attribute>;
    public readonly base: number;
    public readonly modifiers: Set<AttributeModifier>;

    public constructor(attribute: RegistryEntry<Attribute>, base: number, modifiers: Set<AttributeModifier>) {
        this.attribute = attribute;
        this.base = base;
        this.modifiers = modifiers;
    }
}

export class EntityAttributesS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntityAttributesS2CPacket> = payloadType('entity_attr');
    public static readonly CODEC: PacketCodec<EntityAttributesS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.collection(AttrEntry.PACKET_CODEC),
        val => val.entries,
        EntityAttributesS2CPacket.new
    );

    public readonly entityId: number;
    public readonly entries: AttrEntry[];

    public constructor(entityId: number, entries: AttrEntry[]) {
        this.entityId = entityId;
        this.entries = entries;
    }

    public static new(entityId: number, entries: AttrEntry[]) {
        return new EntityAttributesS2CPacket(entityId, entries);
    }

    public static create(entityId: number, attributes: Iterable<AttributeInstance>): EntityAttributesS2CPacket {
        const entries: AttrEntry[] = [];
        for (const entry of attributes) {
            entries.push(new AttrEntry(
                entry.getAttribute(),
                entry.getBaseValue(),
                entry.getModifiers() as Set<AttributeModifier>
            ));
        }

        return new EntityAttributesS2CPacket(entityId, entries);
    }

    public type(): PayloadType<EntityAttributesS2CPacket> {
        return EntityAttributesS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onEntityAttributes(this);
    }

    public estimateSize(): number {
        return 128;
    }
}
