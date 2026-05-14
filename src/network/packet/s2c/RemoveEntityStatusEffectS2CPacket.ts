import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import {StatusEffect} from "../../../entity/effect/StatusEffect.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class RemoveEntityStatusEffectS2CPacket implements Payload {
    public static readonly ID: PayloadType<RemoveEntityStatusEffectS2CPacket> = payloadType('entity_remove_effect');
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

    public type(): PayloadType<any> {
        return RemoveEntityStatusEffectS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onRemoveEntityEffect(this);
    }
}