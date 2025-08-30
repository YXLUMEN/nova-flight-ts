import type {IVec} from "../utils/math/IVec.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import type {Effect} from "../effect/Effect.ts";
import type {Entity} from "../entity/Entity.ts";

export interface ExplosionOpts {
    explosionRadius?: number;        // 视觉半径
    ring?: boolean;
    screenFlash?: boolean;
    // 摄像机震动强度
    shake?: number;
    // 火花数量
    sparks?: number;
    fastSparks?: number,
    damage?: number;        // AoE 伤害
    important?: boolean
}

export interface ExpendExplosionOpts extends ExplosionOpts {
    pos: IVec;
    source: Entity;
    attacker: LivingEntity | null;
    flash: Effect
}