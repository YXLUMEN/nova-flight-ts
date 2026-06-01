import {ProjectileEntity} from "./ProjectileEntity.ts";
import {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";

export class BulletEntity extends ProjectileEntity {
    public constructor(type: EntityType<BulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    protected override onEntityHit(hitResult: EntityHitResult): void {
        if (this.isClient()) return;
        this.discard();

        const sources = this.getWorld().getDamageSources();
        hitResult.entity.takeDamage(
            sources.projectile(this, this.getOwner()),
            this.getHitDamage()
        );
    }
}