import {BulletEntity} from "./BulletEntity.ts";
import {World} from "../../world/World.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";

export class MobBulletEntity extends BulletEntity {
    public override tick() {
        const pos = this.positionRef;
        if (pos.y < -20 || pos.y > World.WORLD_H + 20 || pos.x < -20 || pos.x > World.WORLD_W + 20) {
            this.discard();
            return;
        }

        this.move(this.velocityRef);
    }

    protected override adjustBlockCollision(movement: MutVec2): MutVec2 {
        const map = this.getWorld().getMap();
        const collision = BlockCollision.fastCollision(map, this.getBoundingBox(), movement);
        if (collision) {
            this.discard();
            return movement.multiply(0);
        }

        return movement;
    }
}