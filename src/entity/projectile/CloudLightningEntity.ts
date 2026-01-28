import type {Entity} from "../Entity.ts";
import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";

export class CloudLightningEntity extends ProjectileEntity {
    private readonly radius;

    public constructor(type: EntityType<CloudLightningEntity>, world: World, owner: Entity | null, damage: number, radius = 128) {
        super(type, world, owner, damage);
        this.radius = radius;
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
            this.radius,
            30,
            Math.max(damage * 0.4, 1) | 0
        );
    }
}