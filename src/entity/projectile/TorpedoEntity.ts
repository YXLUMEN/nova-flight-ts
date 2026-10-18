import {LivingEntity} from "../LivingEntity.ts";
import {MissileEntity} from "./MissileEntity.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";

export class TorpedoEntity extends MissileEntity {
    protected override readonly maxRelockCooldown = 10;

    protected override readonly driftAttenuation = false;
    protected override readonly driftSpeed = 2;
    protected override readonly trackingSpeed = 3;

    protected override readonly igniteDelayTicks = 40;
    protected override readonly lockDelayTicks = 80;
    protected override readonly maxLifetimeTicks = 650;

    public override readonly hoverDir: number = 0;

    protected override readonly turnRate = Math.PI / 26;

    protected override onEntityHit(hitResult: EntityHitResult) {
        if (this.isClient()) return;

        const entity = hitResult.entity;
        let damage = this.getHitDamage();
        const sources = this.getWorld().getDamageSources();
        if (entity instanceof LivingEntity) {
            const maxHealth = entity.getMaxHealth();
            damage += maxHealth * 0.4 + (maxHealth - entity.getHealth()) * 0.4;
        }

        const source = sources.kinetic(this, this.getOwner());
        entity.takeDamage(source, damage);

        this.explode(source);
        this.discard();
    }
}