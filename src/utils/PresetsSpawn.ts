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
import type {EntityType} from "../entity/EntityType.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {Behavior} from "../entity/ai/MobAI.ts";

function getHealth(value: number): EntityAttributeModifier {
    return createCleanObj({
        id: Identifier.ofVanilla('spawn.health'),
        value: value
    });
}

const spawnAtTop = (
    type: EntityType<MobEntity>,
    speed = 3, extraHp = 0, worth = 1,
    color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtor(type, [worth], (m) => {
        m.color = color;
        m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(extraHp));
        m.addStatusEffect(new StatusEffectInstance(StatusEffects.SPEED, -1, speed), null);
        m.setHealth(m.getMaxHealth());
    });

const spawnAtTopS = (
    type: EntityType<MobEntity>,
    speed = 3, extraHp = 0, worth = 1,
    color = '#ff6b6b',
    hpScaleFn: (ctx: SpawnCtx) => number = () => 1
): MobFactory => (ctx) => {
    return spawnTopRandomCtorS(type, [worth], (m) => {
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
        m.setBehavior(Behavior.Wander);
    }, opts)(ctx);
}

const spawnAtTopInLine = (
    type: EntityType<MobEntity>,
    count: number,
    gap = 48,
    speed = 130,
    extraHp = 0,
    worth = 1,
    color = '#ff6b6b',
): MobFactory =>
    spawnLineCtor(type, count, [worth],
        (m) => {
            m.setMovementSpeed(speed);
            m.color = color;
            m.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)?.addModifier(getHealth(extraHp));
            m.setHealth(m.getMaxHealth());
        },
        {gap}
    );

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
    spawnAtTop,
    spawnAtTopS,
    spawnInMap,
    spawnAtTopInLine,
    spawnMiniGun,
}