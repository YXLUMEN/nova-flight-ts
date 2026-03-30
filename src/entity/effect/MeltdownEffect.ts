import {StatusEffect} from "./StatusEffect.ts";
import {type LivingEntity} from "../LivingEntity.ts";

export class MeltdownEffect extends StatusEffect {
    public override applyEffectTick(entity: LivingEntity, amplifier: number): boolean {
        const source = entity
            .getWorld()
            .getDamageSources()
            .explosion(null, null);

        const prob = Math.min(0.6, 0.05 + amplifier * 0.1);
        if (Math.random() < prob) {
            entity.takeDamage(source, entity.getMaxHealth());
        } else {
            entity.takeDamage(source, amplifier + 1);
        }
        return true;
    }

    public override shouldApplyThisTick(duration: number): boolean {
        return duration % 10 === 0;
    }
}