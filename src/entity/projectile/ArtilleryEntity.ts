import {FastBulletEntity} from "./FastBulletEntity.ts";
import {type Entity} from "../Entity.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {Techs} from "../../tech/Techs.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class ArtilleryEntity extends FastBulletEntity {
    private hitTime = 0;

    public override onEntityHit(entity: Entity): void {
        if (this.hitTime++ >= 3) {
            this.discard();
        }

        const sources = this.getWorld().getDamageSources();
        const owner = this.getOwner();

        const hitDamage = this.getHitDamage();
        if (owner instanceof PlayerEntity && owner.getTechs().isUnlocked(Techs.ANTIMATTER_WARHEAD)) {
            let damage = hitDamage;
            if (entity instanceof LivingEntity) damage = hitDamage + (entity.getMaxHealth() * 0.08) | 0;
            else damage *= 2;
            entity.takeDamage(sources.kinetic(this, owner), damage);
            return;
        }

        entity.takeDamage(sources.kinetic(this, owner), hitDamage);
    }
}