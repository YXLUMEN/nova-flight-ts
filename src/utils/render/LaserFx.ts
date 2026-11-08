import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {Vec2} from "../math/Vec2.ts";
import type {World} from "../../world/World.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {LaserBeamEffect} from "../../effect/LaserBeamEffect.ts";
import {FancyLaserEffect} from "../../effect/FancyLaserEffect.ts";

export function spawnLaserByVec(world: World, start: Vec2, end: Vec2, color = '#fff', width ?: number, life?: number) {
    spawnLaser(world, start.x, start.y, end.x, end.y, color, width, life);
}

export function spawnLaser(
    world: World,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color = '#fff',
    width ?: number,
    life ?: number
) {
    const effect = new LaserBeamEffect(color, width, life);
    effect.set(startX, startY, endX, endY);
    if (isClient) {
        world.addEffect(null, effect);
        return;
    }
    (world as ServerWorld).spawnVisual(null, effect);
}

export function spawnFancyLaserByVec(world: World, start: Vec2, end: Vec2, color = '#fff', width ?: number, life?: number) {
    spawnFancyLaser(world, start.x, start.y, end.x, end.y, color, width, life);
}

export function spawnFancyLaser(
    world: World,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color = '#fff',
    width ?: number,
    life?: number,
) {
    const effect = new FancyLaserEffect(color, width, life);
    effect.set(startX, startY, endX, endY);
    if (isClient) {
        world.addEffect(null, effect);
        return;
    }
    (world as ServerWorld).spawnVisual(null, effect);
}