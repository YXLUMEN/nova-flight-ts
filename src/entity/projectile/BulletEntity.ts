import {ProjectileEntity} from "./ProjectileEntity.ts";
import {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {clamp} from "../../utils/math/math.ts";

export class BulletEntity extends ProjectileEntity {
    public constructor(type: EntityType<BulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public override onEntityHit(entity: Entity): void {
        this.discard();

        const sources = this.getWorld().getDamageSources();
        const owner = this.getOwner();

        if (owner instanceof PlayerEntity && owner.getTechs().isUnlocked('apfs_discarding_sabot')) {
            let damage = this.damage;
            const factor = clamp(damage * 0.1, 0.1, 0.5);
            if (entity instanceof LivingEntity) damage = this.damage + (entity.getMaxHealth() * factor) | 0;
            else damage *= 2;
            entity.takeDamage(sources.playerAttack(owner), damage);
            return;
        }

        entity.takeDamage(sources.projectile(this, owner), this.damage);
    };
}