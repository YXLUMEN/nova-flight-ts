import {RocketEntity} from "./RocketEntity.ts";
import type {Entity} from "../Entity.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class APRocketEntity extends RocketEntity {
    public override color = "#858585";
    private readonly damagedEntity = new WeakSet<Entity>();

    public override onEntityHit(entity: Entity) {
        if (this.damagedEntity.has(entity)) return;

        let damaged = this.getHitDamage();
        const sources = this.getWorld().getDamageSources();

        if (entity instanceof LivingEntity) {
            damaged += entity.getMaxHealth() * 0.35;
        }
        entity.takeDamage(sources.apDamage(this, this.getOwner()), damaged);
        this.damagedEntity.add(entity);
    }

    public override explode() {
    }
}