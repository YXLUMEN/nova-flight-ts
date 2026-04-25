import type {MobFactory} from "../type/IStage.ts";
import {
    spawnAvoidPlayerCtor,
    spawnFormation,
    spawnLineCtor,
    spawnTopRandomCtor,
    spawnTopRandomCtorS
} from "../world/stage/SpawnFactories.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {EntityAttributes} from "../entity/attribute/EntityAttributes.ts";
import type {EntityType} from "../entity/EntityType.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import {AiBehavior} from "../entity/ai/MobAI.ts";
import type {SpawnContext} from "../world/stage/SpawnContext.ts";
import type {Return} from "../type/types.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {TankEnemy} from "../entity/mob/TankEnemy.ts";

function modifyEntity(
    ctx: SpawnContext,
    mob: MobEntity,
    speed: number,
    extraHp: number,
    color: string,
    hpScaleFn?: Return<SpawnContext, number>
): void {
    mob.color = color;
    mob.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

    const scaledHp = hpScaleFn !== undefined ?
        extraHp * hpScaleFn(ctx) * ctx.difficulty :
        extraHp * ctx.difficulty;

    const maxHealth = mob.getMaxHealth();
    mob.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + scaledHp | 0);
    mob.setHealth(mob.getMaxHealth());

    if (ctx.difficulty > 2 && Math.random() > 0.7) {
        const scaledShield = Math.max(ctx.difficulty, scaledHp / 6);
        mob.addEffect(
            new StatusEffectInstance(StatusEffects.SHIELD, -1, scaledShield),
            null
        );
        return;
    }

    if (ctx.difficulty > 8 && Math.random() > 0.9 && !(mob instanceof TankEnemy)) {
        mob.addEffect(
            new StatusEffectInstance(StatusEffects.RESISTANCE, 800, Math.min(7, ctx.difficulty)),
            null
        );
    }
}

const spawnAtTop = (
    type: EntityType<MobEntity>,
    speed = 1, extraHp = 0, worth = 1,
    color = '#ff6b6b'
): MobFactory => (ctx) => {
    return spawnTopRandomCtor(type, [worth], mob => {
        modifyEntity(ctx, mob, speed, extraHp, color);
    })(ctx);
}

const spawnAtTopS = (
    type: EntityType<MobEntity>,
    speed = 1,
    extraHp = 0,
    worth = 1,
    color = '#ff6b6b',
    hpScaleFn?: Return<SpawnContext, number>
): MobFactory => (ctx) => {
    return spawnTopRandomCtorS(type, [worth], (mob) => {
        modifyEntity(ctx, mob, speed, extraHp, color, hpScaleFn);
    }, {sampler: 'best', candidates: 8, history: 16, minGap: 64, margin: 24})(ctx)
};

const spawnInMap = (
    type: EntityType<MobEntity>,
    speed = 1,
    extraHp = 0,
    worth = 1,
    color = '#ff6b6b',
    opts: { margin?: number, safeRadius?: number } = {},
    hpScaleFn?: Return<SpawnContext, number>
): MobFactory => (ctx) => {
    return spawnAvoidPlayerCtor(type, [worth], (mob) => {
        modifyEntity(ctx, mob, speed, extraHp, color, hpScaleFn);
        mob.getAi().setBehavior(AiBehavior.Wander);
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