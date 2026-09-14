import type {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import type {PacketCodec} from "../../../network/codec/PacketCodec.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {PacketCodecs} from "../../../network/codec/PacketCodecs.ts";
import {SoundEvent} from "../../../sound/SoundEvent.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class ExplosionConfigs {
    public static readonly CODEC: PacketCodec<ExplosionConfigs> = PacketCodecs.of(
        (writer, value) => {
            const flag = value.modifiedFlag();
            writer.writeInt8(flag);

            if (flag & 1 << 0) writer.writeInt8(value.behaviour);
            if (flag & 1 << 1) writer.writeInt8(value.tag);
            if (flag & 1 << 2) writer.writeBoolean(value.decay);
            if (flag & 1 << 3) SoundEvent.SOUND_PACKET_CODEC.encode(writer, value.sound);
        },
        reader => {
            const flag = reader.readInt8();
            if (flag === 0) return new ExplosionConfigs();

            const args = new Array(flag);
            if (flag & 1 << 0) args[0] = reader.readInt8();
            if (flag & 1 << 1) args[1] = reader.readInt8();
            if (flag & 1 << 2) args[2] = reader.readBoolean();
            if (flag & 1 << 3) args[3] = SoundEvent.SOUND_PACKET_CODEC.decode(reader);
            return new ExplosionConfigs(...args);
        }
    );

    public readonly behaviour: ExplosionBehaviour;
    public readonly decay: boolean; // 爆炸伤害等于爆炸强度,爆炸范围等于视觉范围
    public readonly tag: ExplosionTag;
    public readonly sound: SoundEvent;
    public readonly statusEffect?: StatusEffectInstance;

    public constructor(
        behaviour: ExplosionBehaviour = ExplosionBehaviour.BOTH,
        tag: ExplosionTag = ExplosionTag.NONE,
        decay: boolean = true,
        sound: SoundEvent = SoundEvents.EXPLOSION,
        statusEffect?: StatusEffectInstance
    ) {
        this.behaviour = behaviour;
        this.tag = tag;
        this.decay = decay;
        this.sound = sound;
        this.statusEffect = statusEffect;
    }

    public canDamage(_entity: Entity): boolean {
        return true;
    }

    private modifiedFlag(): number {
        let flag = 0;
        if (this.behaviour !== ExplosionBehaviour.BOTH) flag |= 1 << 0;
        if (this.tag !== ExplosionTag.NONE) flag |= 1 << 1;
        if (!this.decay) flag |= 1 << 2;
        if (this.sound !== SoundEvents.EXPLOSION) flag |= 1 << 3;
        return flag;
    }
}

export const enum ExplosionBehaviour {
    BOTH,
    ONLY_DAMAGE,
    ONLY_DESTROY,
    EITHER
}

export const enum ExplosionTag {
    NONE,
    TRIGGERED,
    FUSION
}