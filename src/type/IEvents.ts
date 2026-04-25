import type {BossEntity} from "../entity/mob/BossEntity.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import {createClean} from "../utils/uit.ts";
import type {Entity} from "../entity/Entity.ts";
import type {MissileEntity} from "../entity/projectile/MissileEntity.ts";
import type {Tech} from "../world/tech/Tech.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import type {Explosion} from "../world/explosion/Explosion.ts";
import type {Vec2} from "../utils/math/Vec2.ts";

export const EVENTS = createClean({
    GAME_START: "game:start",
    ENTITY_REMOVED: "entity:mob:removed",
    BOSS_KILLED: "entity:boss:killed",
    BOSS_SPAWN: "entity:boss:spawn",
    MOB_KILLED: "entity:mob:killed",
    MOB_DAMAGE: "entity:mob:damage",
    ENTITY_DIE: "entity:die",
    UNLOCK_TECH: "player:tech:unlock",
    UNLOCK_TECH_SERVER: "server:player:tech:unlock",
    REVOKE_TECH_SERVER: "server:player:tech:revoke",
    EXPLOSION: "world:explosion",
    EMP_BURST: "world:emp_burst",
    STAGE_ENTER: "world:stage:enter",
    STAGE_EXIT: "world:stage:exit",
    ENTITY_LOCKED: "entity:player.locked",
    DIFFICULT_CHANGE: "world:stage:difficult",
    GAME_OVER: "game:over"
} as const);

export type IEvents = {
    [EVENTS.GAME_START]: null;
    [EVENTS.ENTITY_REMOVED]: { entity: Entity; };
    [EVENTS.BOSS_SPAWN]: { entity: BossEntity };
    [EVENTS.BOSS_KILLED]: { entity: BossEntity | null };
    [EVENTS.MOB_KILLED]: { mob: MobEntity; damageSource: DamageSource; pos: Vec2 };
    [EVENTS.MOB_DAMAGE]: { mob: MobEntity; damageSource: DamageSource; };
    [EVENTS.UNLOCK_TECH]: { tech: Tech; silent?: boolean };
    [EVENTS.UNLOCK_TECH_SERVER]: { tech: RegistryEntry<Tech>, player: ServerPlayerEntity };
    [EVENTS.REVOKE_TECH_SERVER]: { tech: RegistryEntry<Tech>, player: ServerPlayerEntity };
    [EVENTS.EXPLOSION]: { explosion: Explosion };
    [EVENTS.EMP_BURST]: { entity: Entity, duration: number };
    [EVENTS.STAGE_ENTER]: { name: string };
    [EVENTS.STAGE_EXIT]: { name: string };
    [EVENTS.ENTITY_LOCKED]: { missile: MissileEntity };
    [EVENTS.DIFFICULT_CHANGE]: { difficult: number };
    [EVENTS.GAME_OVER]: null;
}
