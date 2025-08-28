import {ProjectileEntity} from "./ProjectileEntity.ts";
import {PI2} from "../../utils/math/math.ts";
import {Entity} from "../Entity.ts";
import {PlayerEntity} from "../PlayerEntity.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class BulletEntity extends ProjectileEntity {
    public override render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.getMutPos.x, this.getMutPos.y, this.boxRadius, 0, PI2);
        ctx.fill();
        ctx.restore();
    }

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

        const attacker = this.owner instanceof LivingEntity ? this.owner : null
        entity.takeDamage(sources.mobProjectile(this, attacker), this.damage);
    };
}