import type {ClientWorld} from "../client/ClientWorld.ts";
import type {Entity} from "../entity/Entity.ts";
import {PI2, rand, randInt} from "./math/math.ts";
import type {HexColor} from "../type/types.ts";

export function spawnChargingParticles(
    world: ClientWorld,
    entity: Entity,
    particles: number,
    colorFrom: HexColor,
    colorTo?: HexColor
): void {
    const pos = entity.positionRef;
    const yaw = entity.getYaw();
    const offset = entity.getDimensions().halfWidth;

    const x = Math.cos(yaw) * offset + pos.x;
    const y = Math.sin(yaw) * offset + pos.y;

    if (colorTo === undefined) colorTo = colorFrom;

    for (let i = 0; i < particles; i++) {
        const angle = Math.random() * PI2;
        const radius = 30 + Math.random() * 16;

        const startX = x + Math.cos(angle) * radius;
        const startY = y + Math.sin(angle) * radius;

        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        const speed = -randInt(100, 210);

        world.addParticle(
            startX, startY,
            dirX * speed, dirY * speed,
            rand(0.4, 0.6), rand(2, 3),
            colorFrom, colorTo,
            0,
            0.6
        );
    }
}