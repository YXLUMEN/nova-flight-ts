import {StatusEffect} from "./StatusEffect.ts";
import type {LivingEntity} from "../LivingEntity.ts";

export class RegenerationStatusEffect extends StatusEffect {
    public override applyEffectTick(entity: LivingEntity): boolean {
        if (entity.getHealth() < entity.getMaxHealth()) {
            entity.heal(1);
        }

        return true;
    }

    public override shouldApplyThisTick(duration: number, amplifier: number): boolean {
        const i = 50 >> amplifier;
        return i > 0 ? duration % i === 0 : true;
    }
}