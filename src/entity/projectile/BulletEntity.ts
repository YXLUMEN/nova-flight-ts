import {ProjectileEntity} from "./ProjectileEntity.ts";
import {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {Techs} from "../../tech/Techs.ts";

export class BulletEntity extends ProjectileEntity {
    public constructor(type: EntityType<BulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public override onEntityHit(entity: Entity): void {
        this.discard();

        const sources = this.getWorld().getDamageSources();
        const owner = this.getOwner();

        const hitDamage = this.getHitDamage();
        if (owner instanceof PlayerEntity && owner.getTechs().isUnlocked(Techs.APFS_DISCARDING_SABOT)) {
            let damage = hitDamage;
            if (entity instanceof LivingEntity) damage = hitDamage + (entity.getMaxHealth() * 0.08) | 0;
            else damage *= 2;
            entity.takeDamage(sources.playerAttack(owner), damage);
            return;
        }

        entity.takeDamage(sources.projectile(this, owner), hitDamage);
    }
}