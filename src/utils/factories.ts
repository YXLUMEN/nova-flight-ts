import {Vec2} from "../math/Vec2.ts";
import {BaseEnemy} from "../entity/mob/BaseEnemy.ts";
import type {MobEntity} from "../entity/MobEntity.ts";
import type {MobFactory} from "../apis/IStage.ts";
import {World} from "../World.ts";
import {rand} from "../math/math.ts";

const spawnTopRandom = (speed = 120, health = 1, worth = 1): MobFactory =>
    (_ctx) => {
        const x = rand(24, World.W - 24);
        const m = new BaseEnemy(new Vec2(x, -30), health, worth);
        m.speed = speed;
        return m;
    };

const spawnLine = (count: number, gap = 48, speed = 130, health = 1, worth = 1): MobFactory =>
    (_ctx) => {
        const startX = rand(24, World.W - 24 - gap * (count - 1));
        const arr: MobEntity[] = [];
        for (let i = 0; i < count; i++) {
            const m = new BaseEnemy(new Vec2(startX + i * gap, -30), health, worth);
            m.speed = speed;
            arr.push(m);
        }
        return arr;
    };

export {
    spawnTopRandom,
    spawnLine,
}