import {MobAI} from "./MobAI.ts";
import type {MobEntity} from "../mob/MobEntity.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";

export class SimpleForwardAI extends MobAI {
    public override updateVelocity(mob: MobEntity): void {
        const speedMultiplier = mob.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier <= 0) return;

        const speed = mob.getMovementSpeed() * speedMultiplier;
        const vx = Math.sin(mob.age * 0.05) * 0.8 * speedMultiplier;

        mob.updateVelocity(speed, vx, mob.yStep);
    }
}