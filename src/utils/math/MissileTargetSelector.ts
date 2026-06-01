import type {Vec2} from "./Vec2.ts";
import {PI2} from "./math.ts";
import type {Entity} from "../../entity/Entity.ts";
import {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import type {World} from "../../world/World.ts";

export class PlayerMissileTargetSelector {
    public static acquireTarget(
        world: World,
        missilePos: Vec2,
        missileYaw: number,
        owner: Entity | null,
        hitDamage: number,
        explosionDamage: number,
    ): Entity | null {
        const mobs = world.getMobs();
        if (mobs.size === 0) return null;

        const totalDamage = hitDamage + explosionDamage;
        let best: Entity | null = null;
        let bestScore = -Infinity;

        for (const mob of mobs) {
            if (mob.isRemoved() || mob === owner) continue;

            const currentLocks = MissileEntity.LOCKED_ENTITY.get(mob) ?? 0;
            if (currentLocks * totalDamage >= mob.getMaxHealth()) continue;

            const mobPos = mob.positionRef;
            const dx = mobPos.x - missilePos.x;
            const dy = mobPos.y - missilePos.y;
            const dist2 = dx * dx + dy * dy;

            const yawToMob = Math.atan2(dy, dx);
            const yawDiff = Math.abs(((yawToMob - missileYaw + Math.PI) % PI2) - Math.PI);
            const facingScore = -yawDiff * 200;

            const mobVel = mob.velocityRef;
            const radialSpeed = (dx * mobVel.x + dy * mobVel.y) / Math.sqrt(dist2 + 1);
            const velScore = -Math.abs(radialSpeed) * 0.5;

            const totalScore = facingScore - dist2 + velScore;
            if (totalScore > bestScore) {
                bestScore = totalScore;
                best = mob;
            }
        }

        return best;
    }
}
