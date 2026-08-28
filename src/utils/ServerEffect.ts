import type {ServerWorld} from "../server/ServerWorld.ts";
import type {Vec2} from "./math/Vec2.ts";
import {LaserBeamEffect} from "../effect/LaserBeamEffect.ts";

export function spawnLaserByVec(world: ServerWorld, start: Vec2, end: Vec2, color = '#fff', width = 1, life = 0.1) {
    spawnLaser(world, start.x, start.y, end.x, end.y, color, width, life);
}

export function spawnLaser(
    world: ServerWorld,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color = '#fff',
    width = 1,
    life = 0.1
) {
    const effect = new LaserBeamEffect(color, width, life);
    effect.set(startX, startY, endX, endY);
    world.spawnVisual(null, effect);
}
