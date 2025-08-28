import type {MobFactory, SpawnCtx} from "../apis/IStage.ts";
import {spawnLineCtor, spawnTopRandomCtor, spawnTopRandomCtorS} from "../stage/SpawnFactories.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";

const spawnBase = (speed = 120, hp = 1, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtor(EntityTypes.BASE_ENEMY, [hp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    });

const spawnBaseS = (
    speed = 120, hp = 1, worth = 1,
    color = '#ff6b6b',
    hpScaleFn: (ctx: SpawnCtx) => number = () => 1
): MobFactory => (ctx) => {
    const scaledHp = (hp * hpScaleFn(ctx)) | 0;
    return spawnTopRandomCtorS(EntityTypes.BASE_ENEMY, [scaledHp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    }, {sampler: 'best', candidates: 8, history: 16, minGap: 64, margin: 24})(ctx)
};

const spawnTank = (speed = 120, hp = 1, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtor(EntityTypes.TANK_ENEMY_ENTITY, [hp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    });

const spawnLineBase = (
    count: number,
    gap = 48,
    speed = 130,
    health = 1,
    worth = 1,
    color = '#ff6b6b'
): MobFactory =>
    spawnLineCtor(
        EntityTypes.BASE_ENEMY,
        count,
        [health, worth],
        (m) => {
            m.speed = speed;
            m.color = color;
        },
        {gap}
    );

const spawnGun = (speed = 120, hp = 1, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtorS(EntityTypes.GUN_ENEMY_ENTITY, [hp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    });

export {
    spawnBase,
    spawnBaseS,
    spawnLineBase,
    spawnGun,
    spawnTank
}