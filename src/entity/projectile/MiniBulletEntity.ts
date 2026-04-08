import {BulletEntity} from "./BulletEntity.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";

export class MiniBulletEntity extends BulletEntity {
    protected override onEntityHit(hitResult: EntityHitResult) {
        super.onEntityHit(hitResult);

        if (this.isClient()) return;
        hitResult.entity.velocityRef.multiply(0.8);
    }
}