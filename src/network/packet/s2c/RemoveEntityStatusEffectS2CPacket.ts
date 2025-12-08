import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import {StatusEffect} from "../../../entity/effect/StatusEffect.ts";

export class RemoveEntityStatusEffectS2CPacket implements Payload {
    public static readonly ID: PayloadId<RemoveEntityStatusEffectS2CPacket> = {id: Identifier.ofVanilla('entity_remove_effect')};
    public static readonly CODEC: PacketCodec<RemoveEntityStatusEffectS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        StatusEffect.ENTRY_PACKET_CODEC,
        val => val.effectId,
        RemoveEntityStatusEffectS2CPacket.new
    );

    public readonly entityId: number;
    public readonly effectId: RegistryEntry<StatusEffect>;

    public constructor(entityId: number, effectId: RegistryEntry<StatusEffect>) {
        this.entityId = entityId;
        this.effectId = effectId;
    }

    public static new(entityId: number, effectId: RegistryEntry<StatusEffect>) {
        return new RemoveEntityStatusEffectS2CPacket(entityId, effectId);
    }

    public getId(): PayloadId<any> {
        return RemoveEntityStatusEffectS2CPacket.ID;
    }
}