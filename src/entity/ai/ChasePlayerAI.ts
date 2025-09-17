import {MobAI} from "./MobAI.ts";
import type {MobEntity} from "../mob/MobEntity.ts";
import {World} from "../../world/World.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";

export class ChasePlayerAI extends MobAI {
    public override updateVelocity(mob: MobEntity): void {
        const player = World.instance.player;
        if (!player) return;

        const speedMultiplier = mob.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier <= 0) return;
        const speed = mob.getMovementSpeed() * speedMultiplier;

        const playerPos = player.getPositionRef;
        const pos = mob.getPositionRef;
        const dx = playerPos.x - pos.x;
        const dy = playerPos.y - pos.y;

        mob.setClampYaw(Math.atan2(dy, dx));
        mob.updateVelocity(speed, dx, dy);
    }
}