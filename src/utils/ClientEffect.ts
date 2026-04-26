import type {ClientWorld} from "../client/ClientWorld.ts";
import type {Entity} from "../entity/Entity.ts";
import {PI2, rand, randInt} from "./math/math.ts";

export class ClientEffect {
    public static spawnChargingParticles(world: ClientWorld, entity: Entity, particles: number, colorFrom: string, colorTo?: string): void {
        const pos = entity.positionRef;
        const yaw = entity.getYaw();
        const offset = entity.getWidth() / 2;
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
                0.6
            );
        }
    }

    public static spawnMuzzle(
        world: ClientWorld,
        entity: Entity,
        particles: number,
        colorFrom: string,
        colorTo?: string,
        offset: number = 1,
        maxSpread: number = 0.41886
    ): void {
        const pos = entity.positionRef;
        const yaw = entity.getYaw();
        const x = Math.cos(yaw) * offset + pos.x;
        const y = Math.sin(yaw) * offset + pos.y;

        if (colorFrom === undefined) colorTo = colorFrom;

        for (let i = 0; i < particles; i++) {
            const angleOffset = rand(-maxSpread, maxSpread);
            const particleYaw = yaw + angleOffset;

            const px = Math.cos(particleYaw);
            const py = Math.sin(particleYaw);

            const speed = randInt(100, 210);

            world.addParticle(
                x, y,
                px * speed, py * speed,
                rand(0.4, 0.6), rand(2, 3),
                colorFrom, colorTo,
                0.6
            );
        }
    }
}