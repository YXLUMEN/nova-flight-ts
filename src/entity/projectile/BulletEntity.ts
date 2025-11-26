import {ProjectileEntity} from "./ProjectileEntity.ts";
import {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";

export class BulletEntity extends ProjectileEntity {
    public constructor(type: EntityType<BulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public override onEntityHit(entity: Entity): void {
        this.discard();

        const sources = this.getWorld().getDamageSources();
        const owner = this.getOwner();
        entity.takeDamage(sources.projectile(this, owner), this.damage);
    };
}