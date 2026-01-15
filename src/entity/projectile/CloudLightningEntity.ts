import type {Entity} from "../Entity.ts";
import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";

export class CloudLightningEntity extends ProjectileEntity {
    public constructor(type: EntityType<CloudLightningEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public onEntityHit(entity: Entity): void {
        this.discard();

        const damage = this.getHitDamage();
        entity.takeDamage(
            this.getWorld().getDamageSources().arc(this.getOwner()),
            damage
        );

        this.getWorld().createEMP(
            this.getOwner(),
            this.getPositionRef,
            128,
            30,
            Math.max(damage * 0.4, 1) | 0
        );
    }
}