import {ProjectileEntity} from "./ProjectileEntity.ts";
import {Entity} from "../Entity.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class BulletEntity extends ProjectileEntity {
    public override onEntityHit(entity: Entity): void {
        this.discard();

        const sources = this.getWorld().getDamageSources();
        const owner = this.getOwner();

        if (owner instanceof PlayerEntity) {
            if (owner.techTree.isUnlocked('apfs_discarding_sabot')) {
                let damage = this.damage;
                if (entity instanceof LivingEntity) damage = this.damage + (entity.getMaxHealth() * 0.3) | 0;
                else damage *= 2;
                entity.takeDamage(sources.playerAttack(owner), damage);
                return;
            }
            entity.takeDamage(sources.playerAttack(owner), this.damage);
            return;
        }

        entity.takeDamage(sources.projectile(this, owner), this.damage);
    };
}