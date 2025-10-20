import type {MobFactory, SpawnCtx} from "../apis/IStage.ts";
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

const spawnAtTop = (
    type: EntityType<MobEntity>,
    speed = 1, extraHp = 0, worth = 1,
    color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtor(type, [worth], (m) => {
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

        const maxHealth = m.getMaxHealth();
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + extraHp);
        m.setHealth(m.getMaxHealth());
    });

const spawnAtTopS = (
    type: EntityType<MobEntity>,
    speed = 1, extraHp = 0, worth = 1,
    color = '#ff6b6b',
    hpScaleFn: (ctx: SpawnCtx) => number = () => 1
): MobFactory => (ctx) => {
    return spawnTopRandomCtorS(type, [worth], (m) => {
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

        const scaledHp = (extraHp * hpScaleFn(ctx)) | 0;
        const maxHealth = m.getMaxHealth();
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + scaledHp);
        m.setHealth(m.getMaxHealth());
    }, {sampler: 'best', candidates: 8, history: 16, minGap: 64, margin: 24})(ctx)
};

const spawnInMap = (
    type: EntityType<MobEntity>,
    speed = 1, extraHp = 0, worth = 1,
    color = '#ff6b6b',
    opts: { margin?: number, safeRadius?: number } = {},
    hpScaleFn: (ctx: SpawnCtx) => number = () => 1
): MobFactory => (ctx) => {
    return spawnAvoidPlayerCtor(type, [worth], (m) => {
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

        const scaledHp = (extraHp * hpScaleFn(ctx)) | 0;
        const maxHealth = m.getMaxHealth();
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + scaledHp);
        m.setHealth(m.getMaxHealth());
        m.setBehavior(Behavior.Wander);
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
        (m) => {
            m.color = color;
            m.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);

            const maxHealth = m.getMaxHealth();
            m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + extraHp);
            m.setHealth(m.getMaxHealth());
        },
        {gap}
    );

const spawnMiniGun = (speed = 1, extraHp = 0, worth = 8, color = '#ac0000'): MobFactory =>
    spawnFormation([
        {
            type: EntityTypes.TANK_ENEMY_ENTITY,
            args: [worth],
            init: (m) => {
                m.color = color;
                m.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);
                const maxHealth = m.getMaxHealth();
                m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + extraHp);
                m.setHealth(m.getMaxHealth());
            }
        },
        {
            type: EntityTypes.MINIGUN_ENEMY_ENTITY,
            args: [worth],
            init: (m) => {
                m.color = color;
                m.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.setBaseValue(speed);
                const maxHealth = m.getMaxHealth();
                m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.setBaseValue(maxHealth + extraHp);
                m.setHealth(m.getMaxHealth());
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