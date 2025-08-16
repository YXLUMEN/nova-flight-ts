import type {MobFactory} from "../apis/IStage.ts";
import {BaseEnemy} from "../entity/mob/BaseEnemy.ts";
import {GunEnemyEntity} from "../entity/mob/GunEnemyEntity.ts";
import {spawnLineCtor, spawnTopRandomCtor, spawnTopRandomCtorS} from "../registry/SpawnFactories.ts";

const spawnBase = (speed = 120, hp = 1, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtor(BaseEnemy, [hp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    });

const spawnBaseS = (speed = 120, hp = 1, worth = 1, color = '#ff6b6b'): MobFactory =>
    spawnTopRandomCtorS(BaseEnemy, [hp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    }, {sampler: 'best', candidates: 8, history: 16, minGap: 64, margin: 24});

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
    spawnTopRandomCtor(GunEnemyEntity, [hp, worth], (m) => {
        m.speed = speed;
        m.color = color;
    });

export {
    spawnBase,
    spawnBaseS,
    spawnLineBase,
    spawnGun
}