import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import {squareDistVec2} from "../../utils/math/math.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {ExplodeBulletEntity} from "./ExplodeBulletEntity.ts";
import {AABB} from "../../utils/math/AABB.ts";

export class C125BulletEntity extends ExplodeBulletEntity {
    protected override onEntityHit(hitResult: EntityHitResult) {
        super.onEntityHit(hitResult);

        if (isClient) return;

        const entity = hitResult.entity;
        if (!entity.isPushAble()) return;

        const yaw = this.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);

        const pos = this.positionRef;
        const box = AABB.fromCenter(this.getX(), this.getY(), 64, 64);
        const search = this.getWorld().searchOtherEntities(this, box);
        for (const entity of search) {
            if (entity.isRemoved() || squareDistVec2(pos, entity.positionRef) > 4096) continue;
            entity.updateVelocity(12, f, g);
        }

        entity.updateVelocity(2, f, g);
        entity.velocityModified = true;
    }

    protected override changeColor() {
        this.color.color = '#c68900';
    }
}