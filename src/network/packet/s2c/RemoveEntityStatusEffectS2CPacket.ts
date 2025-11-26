import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import {StatusEffect} from "../../../entity/effect/StatusEffect.ts";
import {Registries} from "../../../registry/Registries.ts";

export class RemoveEntityStatusEffectS2CPacket implements Payload {
    public static readonly ID: PayloadId<RemoveEntityStatusEffectS2CPacket> = {id: Identifier.ofVanilla('entity_remove_effect')};
    public static readonly CODEC: PacketCodec<RemoveEntityStatusEffectS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.entityId);
            StatusEffect.ENTRY_PACKET_CODEC.encode(writer, value.effectId.getValue());
        },
        reader => {
            const entityId = reader.readVarUInt();
            const effect = StatusEffect.ENTRY_PACKET_CODEC.decode(reader);
            const effectId = Registries.STATUS_EFFECT.getEntryByValue(effect)!;
            return new RemoveEntityStatusEffectS2CPacket(
                entityId,
                effectId,
            )
        }
    );

    public readonly entityId: number;
    public readonly effectId: RegistryEntry<StatusEffect>;

    public constructor(entityId: number, effectId: RegistryEntry<StatusEffect>) {
        this.entityId = entityId;
        this.effectId = effectId;
    }

    public getId(): PayloadId<any> {
        return RemoveEntityStatusEffectS2CPacket.ID;
    }
}