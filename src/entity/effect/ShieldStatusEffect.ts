import {StatusEffect} from "./StatusEffect.ts";
import {type LivingEntity} from "../LivingEntity.ts";

export class ShieldStatusEffect extends StatusEffect {
    public override applyUpdateEffect(entity: LivingEntity): boolean {
        return entity.getShieldAmount() > 0 || entity.getWorld().isClient;
    }

    public override canApplyUpdateEffect(): boolean {
        return true;
    }

    public onAppliedAt(entity: LivingEntity, amplifier: number) {
        super.onAppliedAt(entity, amplifier);
        entity.setShieldAmount(Math.max(entity.getShieldAmount(), 4 * (1 + amplifier)));
    }
}