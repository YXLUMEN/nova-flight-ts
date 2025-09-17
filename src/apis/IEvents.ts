import type {BossEntity} from "../entity/mob/BossEntity.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import type {ExpendExplosionOpts} from "./IExplosionOpts.ts";
import {createCleanObj} from "../utils/uit.ts";
import type {Entity} from "../entity/Entity.ts";
import type {MissileEntity} from "../entity/projectile/MissileEntity.ts";

export const EVENTS = createCleanObj({
    ENTITY_REMOVED: "entity:mob:removed",
    BOSS_KILLED: "entity:boss:killed",
    MOB_KILLED: "entity:mob:killed",
    MOB_DAMAGE: "entity:mob:damage",
    ENTITY_DIE: "entity:die",
    UNLOCK_TECH: "player:tech:unlock",
    BOMB_DETONATE: "world:bomb_detonate",
    EMP_BURST: "world:emp_burst",
    STAGE_ENTER: "world:stage:enter",
    PLAYER_LOCKED: "entity:player.locked",
    PLAYER_UNLOCKED: "entity:player.unlocked",
} as const);

export type IEvents = {
    [EVENTS.ENTITY_REMOVED]: { entity: Entity; };
    [EVENTS.BOSS_KILLED]: { mob: BossEntity; damageSource: DamageSource };
    [EVENTS.MOB_KILLED]: { mob: MobEntity; damageSource: DamageSource };
    [EVENTS.MOB_DAMAGE]: { mob: MobEntity; damageSource: DamageSource };
    [EVENTS.UNLOCK_TECH]: { id: string };
    [EVENTS.BOMB_DETONATE]: ExpendExplosionOpts;
    [EVENTS.EMP_BURST]: { duration: number };
    [EVENTS.STAGE_ENTER]: { name: string };
    [EVENTS.PLAYER_LOCKED]: { missile: MissileEntity };
    [EVENTS.PLAYER_UNLOCKED]: any
}
