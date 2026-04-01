import {ProjectileEntity} from "./ProjectileEntity.ts";
import {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {Techs} from "../../world/tech/Techs.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";

export class BulletEntity extends ProjectileEntity {
    public constructor(type: EntityType<BulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    protected override onEntityHit(hitResult: EntityHitResult): void {
        if (this.isClient()) return;

        this.discard();

        const sources = this.getWorld().getDamageSources();
        const owner = this.getOwner();

        const entity = hitResult.entity;
        const hitDamage = this.getHitDamage();
        if (owner instanceof PlayerEntity && owner.getTechs().isUnlocked(Techs.ANTIMATTER_WARHEAD)) {
            let damage = hitDamage;
            if (entity instanceof LivingEntity) damage = hitDamage + (entity.getMaxHealth() * 0.08) | 0;
            else damage *= 2;
            entity.takeDamage(sources.projectile(this, owner), damage);
            return;
        }

        entity.takeDamage(sources.projectile(this, owner), hitDamage);
    }
}