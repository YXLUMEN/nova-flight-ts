import {BulletEntity} from "./BulletEntity.ts";
import {World} from "../../world/World.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";

export class MobBulletEntity extends BulletEntity {
    public override tick() {
        const pos = this.getPositionRef;
        if (pos.y < -20 || pos.y > World.WORLD_H + 20 || pos.x < -20 || pos.x > World.WORLD_W + 20) {
            this.discard();
            return;
        }

        this.move(this.getVelocityRef);
    }

    protected override adjustBlockCollision(movement: IVec): IVec {
        const map = this.getWorld().getMap();
        const collision = BlockCollision.fastCollision(map, this.getBoundingBox(), movement);
        if (collision) {
            this.discard();
            return Vec2.ZERO;
        }

        return movement;
    }
}