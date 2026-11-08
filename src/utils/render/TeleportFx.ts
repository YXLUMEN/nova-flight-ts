import type {World} from "../../world/World.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {HexColor} from "../../type/types.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {Vec2} from "../math/Vec2.ts";
import {TeleportEffect, TeleportPhase} from "../../effect/TeleportEffect.ts";
import {ParticleEffects} from "../../effect/particle/ParticleEffects.ts";


export const TELEPORT_MIN_DISTANCE_SQ = 4;
const PARTICLE_COUNT = 18;

export function spawnTeleportFx(
    world: World,
    from: Vec2,
    to: Vec2,
    color?: HexColor,
    radius?: number
): void {
    const sameSpot = Vec2.distSq(from, to) < TELEPORT_MIN_DISTANCE_SQ;
    const effects = sameSpot
        ? [new TeleportEffect(to, color, TeleportPhase.IN, radius)]
        : [
            new TeleportEffect(from, color, TeleportPhase.OUT, radius),
            new TeleportEffect(to, color, TeleportPhase.IN, radius),
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
