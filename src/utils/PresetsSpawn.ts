import type {MobFactory, SpawnCtx} from "../apis/IStage.ts";
import {BaseEnemy} from "../entity/BaseEnemy.ts";
import {GunEnemyEntity} from "../entity/GunEnemyEntity.ts";
import {spawnLineCtor, spawnTopRandomCtor, spawnTopRandomCtorS} from "../stage/SpawnFactories.ts";
import {TankEnemy} from "../entity/TankEnemy.ts";

const spawnBase = (speed = 120, hp = 1, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtor(BaseEnemy, [hp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    });

const spawnBaseS = (
    speed = 120, hp = 1, worth = 1,
    color = '#ff6b6b',
    hpScaleFn: (ctx: SpawnCtx) => number = () => 1
): MobFactory => (ctx) => {
    const scaledHp = (hp * hpScaleFn(ctx)) | 0;
    return spawnTopRandomCtorS(BaseEnemy, [scaledHp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    }, {sampler: 'best', candidates: 8, history: 16, minGap: 64, margin: 24})(ctx)
};

const spawnTank = (speed = 120, hp = 1, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtor(TankEnemy, [hp, worth], (m) => {
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
        BaseEnemy,
        count,
        [health, worth],
        (m) => {
            m.speed = speed;
            m.color = color;
        },
        {gap}
    );

const spawnGun = (speed = 120, hp = 1, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtorS(GunEnemyEntity, [hp, worth], (m) => {
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