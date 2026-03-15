import {RocketEntity} from "./RocketEntity.ts";
import type {Entity} from "../Entity.ts";
import {LivingEntity} from "../LivingEntity.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";

export class APRocketEntity extends RocketEntity {
    public override noClip = true;

    public override color = "#858585";
    private readonly damagedEntity = new WeakSet<Entity>();

    protected override onEntityHit(hitResult: EntityHitResult) {
        const entity = hitResult.entity;
        if (this.damagedEntity.has(entity)) return;

        let damaged = this.getHitDamage();
        const sources = this.getWorld().getDamageSources();

        if (entity instanceof LivingEntity) {
            damaged += entity.getMaxHealth() * 0.35;
        }
        entity.takeDamage(sources.apDamage(this, this.getOwner()), damaged);
        this.damagedEntity.add(entity);
    }

    protected override onBlockHit() {
    }

    public override explode() {
    }
}