import {ExplodeBulletEntity} from "./ExplodeBulletEntity.ts";
import {BossEntity} from "../mob/BossEntity.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {squareDistVec2} from "../../utils/math/math.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";

export class C125BulletEntity extends ExplodeBulletEntity {
    public override color = '#c68900';

    protected override onEntityHit(hitResult: EntityHitResult) {
        super.onEntityHit(hitResult);

        if (this.isClient()) return;

        const entity = hitResult.entity;
        if (entity instanceof BossEntity) return;

        const yaw = this.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);
        if (this.getOwner() instanceof PlayerEntity) {
            const pos = this.getPositionRef;

            for (const mob of this.getWorld().getMobs()) {
                if (mob.isRemoved() || squareDistVec2(pos, mob.getPositionRef) > 4096) continue;
                mob.updateVelocity(12, f, g);
            }
        }

        entity.updateVelocity(2, f, g);
    }
}