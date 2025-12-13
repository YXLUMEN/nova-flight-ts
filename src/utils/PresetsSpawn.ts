import type {MobFactory} from "../apis/IStage.ts";
import {
    spawnAvoidPlayerCtor,
    spawnFormation,
    spawnLineCtor,
    spawnTopRandomCtor,
    spawnTopRandomCtorS
} from "../stage/SpawnFactories.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {EntityAttributes} from "../entity/attribute/EntityAttributes.ts";
import type {EntityType} from "../entity/EntityType.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import {Behavior} from "../entity/ai/MobAI.ts";
import type {SpawnContext} from "../stage/SpawnContext.ts";
import type {FunctionReturn} from "../apis/types.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";

const spawnAtTop = (
    type: EntityType<MobEntity>,
    speed = 1, extraHp = 0, worth = 1,
    color = '#ff6b6b'
): MobFactory => (ctx) => {
    return spawnTopRandomCtor(type, [worth], (m) => {
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

        const maxHealth = m.getMaxHealth() * ctx.difficulty;
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + extraHp);
        m.setHealth(m.getMaxHealth());
    })(ctx);
}

const spawnAtTopS = (
    type: EntityType<MobEntity>,
    speed = 1,
    extraHp = 0,
    worth = 1,
    color = '#ff6b6b',
    hpScaleFn?: FunctionReturn<SpawnContext, number>
): MobFactory => (ctx) => {
    return spawnTopRandomCtorS(type, [worth], (mob) => {
        mob.color = color;
        mob.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

        const scaledHp = hpScaleFn !== undefined ?
            extraHp * hpScaleFn(ctx) * ctx.difficulty :
            extraHp * ctx.difficulty;

        const maxHealth = mob.getMaxHealth();
        mob.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + scaledHp | 0);
        mob.setHealth(mob.getMaxHealth());
    }, {sampler: 'best', candidates: 8, history: 16, minGap: 64, margin: 24})(ctx)
};

const spawnInMap = (
    type: EntityType<MobEntity>,
    speed = 1,
    extraHp = 0,
    worth = 1,
    color = '#ff6b6b',
    opts: { margin?: number, safeRadius?: number } = {},
    hpScaleFn?: FunctionReturn<SpawnContext, number>
): MobFactory => (ctx) => {
    return spawnAvoidPlayerCtor(type, [worth], (mob) => {
        mob.color = color;
        mob.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

        const scaledHp = hpScaleFn !== undefined ?
            extraHp * hpScaleFn(ctx) * ctx.difficulty :
            extraHp * ctx.difficulty;

        const maxHealth = mob.getMaxHealth();
        mob.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + scaledHp | 0);
        mob.setHealth(mob.getMaxHealth());
        mob.getAi().setBehavior(mob, Behavior.Wander);
        if (ctx.difficulty > 9 && Math.random() > 0.8) {
            mob.addStatusEffect(
                new StatusEffectInstance(StatusEffects.RESISTANCE, 800, Math.min(7, ctx.difficulty)),
                null
            );
        }
    }, opts)(ctx);
}

const spawnAtTopInLine = (
    type: EntityType<MobEntity>,
    count: number,
    gap = 48,
    speed = 1,
    extraHp = 0,
    worth = 1,
    color = '#ff6b6b',
): MobFactory =>
    spawnLineCtor(type, count, [worth],
        mob => {
            mob.color = color;
            mob.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

            const maxHealth = mob.getMaxHealth();
            mob.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + extraHp);
            mob.setHealth(mob.getMaxHealth());
        },
        {gap}
    );

const spawnMiniGun = (speed = 1, extraHp = 0, worth = 8, color = '#ac0000'): MobFactory =>
    spawnFormation([
        {
            type: EntityTypes.TANK_ENEMY_ENTITY,
            args: [worth],
            init: (mob) => {
                mob.color = color;
                mob.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);
                const maxHealth = mob.getMaxHealth();
                mob.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + extraHp);
                mob.setHealth(mob.getMaxHealth());
            }
        },
        {
            type: EntityTypes.MINIGUN_ENEMY_ENTITY,
            args: [worth],
            init: (mob) => {
                mob.color = color;
                mob.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);
                const maxHealth = mob.getMaxHealth();
                mob.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + extraHp);
                mob.setHealth(mob.getMaxHealth());
            }
        }
    ]);


export {
    spawnAtTop,
    spawnAtTopS,
    spawnInMap,
    spawnAtTopInLine,
    spawnMiniGun,
}