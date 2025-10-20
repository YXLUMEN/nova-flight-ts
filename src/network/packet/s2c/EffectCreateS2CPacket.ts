import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {type VisualEffect} from "../../../effect/VisualEffect.ts";
import {Registries} from "../../../registry/Registries.ts";

export class EffectCreateS2CPacket implements Payload {
    public static readonly ID: PayloadId<EffectCreateS2CPacket> = {id: Identifier.ofVanilla('effect_create')};
    public static readonly CODEC: PacketCodec<EffectCreateS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            const type = value.effect.getType();
            const id = Registries.EFFECT_TYPE.getId(type)!;

            Identifier.PACKET_CODEC.encode(writer, id);
            type.codec.encode(writer, value.effect);
        },
        reader => {
            const id = Identifier.PACKET_CODEC.decode(reader);
            const effectType = Registries.EFFECT_TYPE.getEntryById(id)!.getValue();
            const effect = effectType.codec.decode(reader);

            return new EffectCreateS2CPacket(effect);
        }
    );

    public readonly effect: VisualEffect;

    public constructor(effect: VisualEffect) {
        this.effect = effect;
    }

    public getId(): PayloadId<EffectCreateS2CPacket> {
        return EffectCreateS2CPacket.ID;
    }
}