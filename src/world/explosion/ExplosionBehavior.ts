import type {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import type {Entity} from "../../entity/Entity.ts";

export const enum ExplosionBehaviour {
    BOTH,
    ONLY_DAMAGE,
    ONLY_DESTROY,
    EITHER
}

export const enum ExplosionEffect {
    NONE,
    TRIGGERED,
    FUSION
}

export class ExplosionBehavior {
    public static readonly CODEC: PacketCodec<ExplosionBehavior> = PacketCodecs.of(
        (writer, value) => {
            const flag = value.modifiedFlag();
            writer.writeInt8(flag);

            if (flag & 1 << 0) writer.writeInt8(value.behaviour);
            if (flag & 1 << 1) writer.writeInt8(value.effect);
            if (flag & 1 << 2) writer.writeBoolean(value.decay);
            if (flag & 1 << 3) writer.writeBoolean(value.playSound);
        },
        reader => {
            const flag = reader.readInt8();
            if (flag === 0) return new ExplosionBehavior();

            const args = new Array(flag);
            if (flag & 1 << 0) args[0] = reader.readInt8();
            if (flag & 1 << 1) args[1] = reader.readInt8();
            if (flag & 1 << 2) args[2] = reader.readBoolean();
            if (flag & 1 << 3) args[3] = reader.readBoolean();
            return new ExplosionBehavior(...args);
        }
    );

    public readonly behaviour: ExplosionBehaviour;

    // 爆炸伤害等于爆炸强度,爆炸范围等于视觉范围
    public readonly decay: boolean;

    public effect: ExplosionEffect;
    public playSound: boolean;
    public readonly statusEffect?: StatusEffectInstance;

    public constructor(
        behaviour: ExplosionBehaviour = ExplosionBehaviour.BOTH,
        effect: ExplosionEffect = ExplosionEffect.NONE,
        decay: boolean = true,
        playSound: boolean = true,
        statusEffect?: StatusEffectInstance
    ) {
        this.behaviour = behaviour;
        this.effect = effect;
        this.decay = decay;
        this.playSound = playSound;
        this.statusEffect = statusEffect;
    }

    public canDamage(_entity: Entity): boolean {
        return true;
    }

    public modifiedFlag(): number {
        let flag = 0;
        if (this.behaviour !== ExplosionBehaviour.BOTH) flag |= 1 << 0;
        if (this.effect !== ExplosionEffect.NONE) flag |= 1 << 1;
        if (!this.decay) flag |= 1 << 2;
        if (!this.playSound) flag |= 1 << 3;
        return flag;
    }
}