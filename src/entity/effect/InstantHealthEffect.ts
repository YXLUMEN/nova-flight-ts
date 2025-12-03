import {type LivingEntity} from "../LivingEntity.ts";
import {InstantStatusEffect} from "./InstantStatusEffect.ts";

export class InstantHealthEffect extends InstantStatusEffect {
    public constructor() {
        super(0, '#ff2424');
    }

    public override applyUpdateEffect(entity: LivingEntity, amplifier: number): boolean {
        if (entity.getWorld().isClient) return true;
        entity.heal(Math.max((4 << amplifier), 0));
        return true;
    }
}