import {type LivingEntity} from "../LivingEntity.ts";
import {InstantStatusEffect} from "./InstantStatusEffect.ts";
import type {Entity} from "../Entity.ts";

export class InstantHealthEffect extends InstantStatusEffect {
    public constructor() {
        super(0, '#ff2424');
    }

    public override applyEffectTick(_source: Entity | null, entity: LivingEntity, amplifier: number): boolean {
        entity.heal(Math.max((4 << amplifier), 0));
        return true;
    }
}