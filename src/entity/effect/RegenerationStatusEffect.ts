import {StatusEffect} from "./StatusEffect.ts";
import type {LivingEntity} from "../LivingEntity.ts";

export class RegenerationStatusEffect extends StatusEffect {
    public override applyUpdateEffect(entity: LivingEntity): boolean {
        if (entity.getHealth() < entity.getMaxHealth()) {
            entity.heal(1);
        }

        return true;
    }

    public override canApplyUpdateEffect(duration: number, amplifier: number): boolean {
        const i = 50 >> amplifier;
        return i > 0 ? duration % i === 0 : true;
    }
}