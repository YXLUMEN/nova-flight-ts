import {StatusEffect} from "./StatusEffect.ts";
import {type LivingEntity} from "../LivingEntity.ts";
import type {Entity} from "../Entity.ts";

export class MeltdownEffect extends StatusEffect {
    public override applyEffectTick(source: Entity | null, entity: LivingEntity, amplifier: number): boolean {
        const damageSource = entity
            .getWorld()
            .getDamageSources()
            .explosion(null, source);

        const prob = Math.min(0.6, 0.01 + amplifier * 0.1);
        if (Math.random() < prob) {
            entity.takeDamage(damageSource, entity.getMaxHealth());
        } else {
            entity.takeDamage(damageSource, amplifier + 1);
        }
        return true;
    }

    public override shouldApplyThisTick(duration: number): boolean {
        return duration % 10 === 0;
    }
}