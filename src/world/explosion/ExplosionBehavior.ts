import type {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {config} from "../../utils/uit.ts";
import type {Entity} from "../../entity/Entity.ts";

export const BehaviourEnum = config({
    BOTH: 0,
    ONLY_DAMAGE: 1,
    ONLY_DESTROY: 2,
    EITHER: 3
});

export const EffectEnum = config({
    NONE: 0,
    TRIGGERED: 1,
    FUSION: 2
});

export type Behaviour = typeof BehaviourEnum[keyof typeof BehaviourEnum];
export type ExpEffect = typeof EffectEnum[keyof typeof EffectEnum];

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

    public readonly behaviour: Behaviour;

    // 爆炸伤害等于爆炸强度,爆炸范围等于视觉范围
    public readonly decay: boolean;

    public effect: ExpEffect;
    public playSound: boolean;
    public readonly statusEffect?: StatusEffectInstance;

    public constructor(
        behaviour: Behaviour = BehaviourEnum.BOTH,
        effect: ExpEffect = EffectEnum.NONE,
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
        if (this.behaviour !== BehaviourEnum.BOTH) flag |= 1 << 0;
        if (this.effect !== EffectEnum.NONE) flag |= 1 << 1;
        if (!this.decay) flag |= 1 << 2;
        if (!this.playSound) flag |= 1 << 3;
        return flag;
    }
}