import {ProjectileEntity} from "./ProjectileEntity.ts";
import {Entity} from "../Entity.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class BulletEntity extends ProjectileEntity {
    public override onEntityHit(entity: Entity): void {
        this.discard();

        const sources = this.getWorld().getDamageSources();
        if (this.owner instanceof PlayerEntity) {
            if (this.owner.techTree.isUnlocked('apfs_discarding_sabot')) {
                let damage = this.damage;
                if (entity instanceof LivingEntity) damage = this.damage + (entity.getMaxHealth() * 0.3) | 0;
                else damage *= 2;
                entity.takeDamage(sources.playerAttack(this.owner), damage);
                return;
            }
            entity.takeDamage(sources.playerAttack(this.owner), this.damage);
            return;
        }

        entity.takeDamage(sources.mobProjectile(this, this.owner), this.damage);
    };
}