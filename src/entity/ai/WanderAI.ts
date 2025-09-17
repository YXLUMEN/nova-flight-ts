import {MobAI} from "./MobAI.ts";
import type {MobEntity} from "../mob/MobEntity.ts";
import {World} from "../../world/World.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

export class WanderAI extends MobAI {
    private readonly dir = new MutVec2(1, 0);
    private changeTimer = 0;

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

        mob.setClampYaw(Math.atan2(dy, dx), 0.03926875);
        if (this.changeTimer-- <= 0) {
            this.dir.set(Math.random() - 0.5, Math.random() - 0.5);
            this.changeTimer = 50;
        }
        mob.updateVelocity(speed, this.dir.x, this.dir.y);
    }
}