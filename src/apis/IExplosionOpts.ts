import type {IEffect} from "../effect/IEffect.ts";
import type {Entity} from "../entity/Entity.ts";
import type {StatusEffect} from "../entity/effect/StatusEffect.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";

export interface ExplosionOpts {
    explosionRadius?: number;        // 视觉半径
    ring?: boolean;
    screenFlash?: boolean;
    // 摄像机震动强度
    shake?: number;
    // 火花数量
    sparks?: number;
    fastSparks?: number;
    damage?: number;        // AoE 伤害
    important?: boolean;
    explodeColor?: string;
    statusEffect?: { effect: RegistryEntry<StatusEffect>; duration: number, amplifier: number };
}

export interface ExpendExplosionOpts extends ExplosionOpts {
    attacker: Entity | null;
    flash?: IEffect
}