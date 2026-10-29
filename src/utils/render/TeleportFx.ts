import type {World} from "../../world/World.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {HexColor} from "../../type/types.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {Vec2} from "../math/Vec2.ts";
import {TeleportEffect, TeleportPhase} from "../../effect/TeleportEffect.ts";
import {ParticleEffects} from "../../effect/particle/ParticleEffects.ts";

export const TELEPORT_COLOR: HexColor = '#8a6dff';
/** 小于该距离平方的位移不视为传送（避免原地同步也触发特效）。 */
export const TELEPORT_MIN_DISTANCE_SQ = 4;

const PARTICLE_COUNT = 18;

/**
 * 在传送起点与终点生成传送特效。
 *
 * 客户端直接加入渲染队列；服务端通过 {@link ServerWorld.spawnVisual}
 * 和预制粒子包广播给所有客户端。
 */
export function spawnTeleportFx(
    world: World,
    from: Vec2,
    to: Vec2,
    color: HexColor = TELEPORT_COLOR,
): void {
    const sameSpot = Vec2.distSq(from, to) < TELEPORT_MIN_DISTANCE_SQ;
    const effects = sameSpot
        ? [new TeleportEffect(to, color, TeleportPhase.IN)]
        : [
            new TeleportEffect(from, color, TeleportPhase.OUT),
            new TeleportEffect(to, color, TeleportPhase.IN),
        ];

    if (isClient) {
        for (const effect of effects) world.addEffect(null, effect);
        world.addParticleVec(ParticleEffects.TELEPORT, to, PARTICLE_COUNT);
        if (sameSpot) return;
        world.addParticleVec(ParticleEffects.TELEPORT, from, PARTICLE_COUNT);
        return;
    }

    const server = world as ServerWorld;
    for (const effect of effects) server.spawnVisual(null, effect);
    server.spawnParticle(ParticleEffects.TELEPORT, to, PARTICLE_COUNT);
    if (sameSpot) return;
    server.spawnParticle(ParticleEffects.TELEPORT, from, PARTICLE_COUNT);
}
