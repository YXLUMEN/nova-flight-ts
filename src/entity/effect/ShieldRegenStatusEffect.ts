import {StatusEffect, StatusEffectCategory} from "./StatusEffect.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import type {Entity} from "../Entity.ts";

export class ShieldRegenStatusEffect extends StatusEffect {
    public constructor() {
        super(StatusEffectCategory.BENEFICIAL, '#6ec8ff');
    }

    public override applyEffectTick(_source: Entity | null, entity: LivingEntity): boolean {
        const max = entity.getMaxShield();
        if (max <= 0) return false;

        const current = entity.getShieldAmount();
        if (current < max) {
            entity.setShieldAmount(current + 1);
        }
        return true;
    }

    public override shouldApplyThisTick(tickCount: number, amplifier: number): boolean {
        const i = 40 >> amplifier;
        return i > 0 ? tickCount % i === 0 : true;
    }
}
