import {StatusEffect} from "./StatusEffect.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import type {Entity} from "../Entity.ts";

export class ShieldRegenStatusEffect extends StatusEffect {
    public constructor() {
        super(0, '#6ec8ff');
    }

    public override applyEffectTick(_source: Entity | null, entity: LivingEntity, amplifier: number): boolean {
        const max = entity.getMaxShield();
        if (max <= 0) return true;

        const current = entity.getShieldAmount();
        if (current < max) {
            entity.setShieldAmount(current + 1 + amplifier);
        }
        return true;
    }

    public override shouldApplyThisTick(duration: number, amplifier: number): boolean {
        const i = 40 >> amplifier;
        return i > 0 ? duration % i === 0 : true;
    }
}
