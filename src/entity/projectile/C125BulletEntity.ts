import {ExplodeBulletEntity} from "./ExplodeBulletEntity.ts";
import type {Entity} from "../Entity.ts";
import {BossEntity} from "../mob/BossEntity.ts";

export class C125BulletEntity extends ExplodeBulletEntity {
    public override color = '#c68900';

    public override onEntityHit(entity: Entity) {
        super.onEntityHit(entity);

        if (entity instanceof BossEntity) return;

        const yaw = this.getYaw();
        entity.updateVelocity(12, Math.cos(yaw), Math.sin(yaw));
    }
}