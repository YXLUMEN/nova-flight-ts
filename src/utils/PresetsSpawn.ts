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
import {createCleanObj} from "./uit.ts";
import type {EntityAttributeModifier} from "../entity/attribute/EntityAttributeModifier.ts";
import {Identifier} from "../registry/Identifier.ts";
import {ChasePlayerAI} from "../entity/ai/ChasePlayerAI.ts";
import type {EntityType} from "../entity/EntityType.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import {GunEnemyEntity} from "../entity/mob/GunEnemyEntity.ts";
import {MiniGunEnemyEntity} from "../entity/mob/MiniGunEnemyEntity.ts";
import {WanderAI} from "../entity/ai/WanderAI.ts";

function getHealth(value: number): EntityAttributeModifier {
    return createCleanObj({
        id: Identifier.ofVanilla('spawn.health'),
        value: value
    });
}

const spawnBase = (speed = 3, extraHp = 0, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtor(EntityTypes.BASE_ENEMY, [worth], (m) => {
        m.setMovementSpeed(speed);
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(extraHp));
        m.setHealth(m.getMaxHealth());
    });

const spawnBaseS = (
    speed = 3, extraHp = 0, worth = 1,
    color = '#ff6b6b',
    hpScaleFn: (ctx: SpawnCtx) => number = () => 1
): MobFactory => (ctx) => {
    return spawnTopRandomCtorS(EntityTypes.BASE_ENEMY, [worth], (m) => {
        const scaledHp = (extraHp * hpScaleFn(ctx)) | 0;
        m.setMovementSpeed(speed);
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(scaledHp));
        m.setHealth(m.getMaxHealth());
    }, {sampler: 'best', candidates: 8, history: 16, minGap: 64, margin: 24})(ctx)
};

const spawnInMap = (
    type: EntityType<MobEntity>,
    speed = 3, extraHp = 0, worth = 1,
    color = '#ff6b6b',
    opts: { margin?: number, safeRadius?: number } = {},
    hpScaleFn: (ctx: SpawnCtx) => number = () => 1
): MobFactory => (ctx) => {
    return spawnAvoidPlayerCtor(type, [worth], (m) => {
        const scaledHp = (extraHp * hpScaleFn(ctx)) | 0;
        m.setMovementSpeed(speed);
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(scaledHp));
        m.setHealth(m.getMaxHealth());
        if (m instanceof GunEnemyEntity || m instanceof MiniGunEnemyEntity) {
            m.setAI(new WanderAI());
        } else {
            m.setAI(new ChasePlayerAI());
        }
    }, opts)(ctx);
}

const spawnTank = (
    speed = 3, extraHp = 0, worth = 1,
    color = '#ff6b6b',
    hpScaleFn: (ctx: SpawnCtx) => number = () => 1
): MobFactory => (ctx) => {
    return spawnTopRandomCtor(EntityTypes.TANK_ENEMY_ENTITY, [worth], (m) => {
        const scaledHp = (extraHp * hpScaleFn(ctx)) | 0;
        m.setMovementSpeed(speed);
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(scaledHp));
    })(ctx);
}

const spawnLineBase = (
    count: number,
    gap = 48,
    speed = 130,
    extraHp = 0,
    worth = 1,
    color = '#ff6b6b',
): MobFactory =>
    spawnLineCtor(
        EntityTypes.BASE_ENEMY,
        count,
        [worth],
        (m) => {
            m.setMovementSpeed(speed);
            m.color = color;
            m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(extraHp));
            m.setHealth(m.getMaxHealth());
        },
        {gap}
    );

const spawnGun = (speed = 3, extraHp = 0, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtorS(EntityTypes.GUN_ENEMY_ENTITY, [worth], (m) => {
        m.setMovementSpeed(speed);
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(extraHp));
        m.setHealth(m.getMaxHealth());
    });

const spawnMiniGun = (speed = 3, extraHp = 0, worth = 8, color = '#ac0000'): MobFactory =>
    spawnFormation([
        {
            type: EntityTypes.TANK_ENEMY_ENTITY,
            args: [worth],
            init: (m) => {
                m.setMovementSpeed(speed);
                m.color = color;
                m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(extraHp));
                m.setHealth(m.getMaxHealth());
            }
        },
        {
            type: EntityTypes.MINIGUN_ENEMY_ENTITY,
            args: [worth],
            init: (m) => {
                m.setMovementSpeed(speed);
                m.color = color;
                m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(extraHp));
                m.setHealth(m.getMaxHealth());
            }
        }
    ]);


export {
    spawnBase,
    spawnBaseS,
    spawnInMap,
    spawnLineBase,
    spawnGun,
    spawnTank,
    spawnMiniGun
}