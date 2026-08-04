import type {Entity} from "../Entity.ts";
import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
import {Emp} from "../../world/element/Emp.ts";

export class CloudLightningEntity extends ProjectileEntity {
    private readonly radius;

    public constructor(type: EntityType<CloudLightningEntity>, world: World, owner: Entity | null, damage: number, radius = 128) {
        super(type, world, owner, damage);
        this.radius = radius;
    }

    protected onEntityHit(hitResult: EntityHitResult): void {
        super.onEntityHit(hitResult);

        if (this.isClient()) return;

        const damage = this.getHitDamage();
        hitResult.entity.takeDamage(
            this.getWorld().getDamageSources().arc(this.getOwner()),
            damage
        );

        this.getWorld().applyElement(Emp.create(
            this.getOwner(),
            this.positionRef,
            this.radius,
            30,
            Math.max((damage * 0.4) | 0, 1)
        ));
    }

    protected override onBlockHit(hitResult: BlockHitResult) {
        super.onBlockHit(hitResult);

        const world = this.getWorld();
        if (world.isClient) return;
        world.applyElement(Emp.create(
            this.getOwner(),
            hitResult.pos,
            this.radius,
            30,
            Math.max(this.getHitDamage() * 0.4, 1) | 0
        ));
    }
}