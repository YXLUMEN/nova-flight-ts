import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import {StatusEffect} from "../../../entity/effect/StatusEffect.ts";
import type {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";

export class EntityStatusEffectS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityStatusEffectS2CPacket> = {id: Identifier.ofVanilla('entity_status_effect')};
    public static readonly CODEC: PacketCodec<EntityStatusEffectS2CPacket> = PacketCodecs.of(this.write, this.read);

    public readonly entityId: number;
    public readonly effectId: RegistryEntry<StatusEffect>;
    public readonly amplifier: number;
    public readonly duration: number;

    public constructor(entityId: number, effectId: RegistryEntry<StatusEffect>, amplifier: number, duration: number) {
        this.entityId = entityId;
        this.effectId = effectId;
        this.amplifier = amplifier;
        this.duration = duration;
    }

    public static create(entityId: number, effect: StatusEffectInstance): EntityStatusEffectS2CPacket {
        return new EntityStatusEffectS2CPacket(
            entityId,
            effect.getEffectType(),
            effect.getAmplifier(),
            effect.getDuration(),
        );
    }

    private static write(writer: BinaryWriter, value: EntityStatusEffectS2CPacket) {
        writer.writeVarUint(value.entityId);
        StatusEffect.ENTRY_PACKET_CODEC.encode(writer, value.effectId);
        writer.writeVarUint(value.amplifier);
        writer.writeVarUint(value.duration);
    }

    private static read(reader: BinaryReader): EntityStatusEffectS2CPacket {
        const entityId = reader.readVarUint();
        const effect = StatusEffect.ENTRY_PACKET_CODEC.decode(reader);

        return new EntityStatusEffectS2CPacket(
            entityId,
            effect,
            reader.readVarUint(),
            reader.readVarUint(),
        );
    }

    public getId(): PayloadId<EntityStatusEffectS2CPacket> {
        return EntityStatusEffectS2CPacket.ID;
    }
}