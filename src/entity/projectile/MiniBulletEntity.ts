import {BulletEntity} from "./BulletEntity.ts";
import type {Entity} from "../Entity.ts";

export class MiniBulletEntity extends BulletEntity {
    public override onEntityHit(entity: Entity) {
        super.onEntityHit(entity);

        entity.getVelocityRef.multiply(0.8);
    }
}