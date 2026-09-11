import {BulletEntity} from "./BulletEntity.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";

/**
 * **不推荐** 继承此类, 它只作为特例优化. 除非有充分的理由.
 *
 * 基于 **"敌方子弹慢速假设"** 创建此实体时不推荐采取过高的速度
 * @see {ServerWorld.tickPlayer}
 * */
export class MobBulletEntity extends BulletEntity {
    public override tick() {
        if (this.clampPosition()) return;
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