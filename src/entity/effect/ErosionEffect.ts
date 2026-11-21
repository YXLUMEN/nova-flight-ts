import type {Entity} from "../Entity.ts";
import {StatusEffect, StatusEffectCategory} from "./StatusEffect.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class ErosionEffect extends StatusEffect {
    private readonly damage: number;

    public constructor(baseDps: number) {
        super(StatusEffectCategory.HARMFUL, '#91745d');
        this.damage = baseDps;
    }

    public override applyEffectTick(source: Entity | null, entity: Entity, amplifier: number): boolean {
        const world = entity.getWorld();
        let damage: number = this.damage;
        if (amplifier > 8 && entity instanceof LivingEntity) {
            damage += entity.getHealth() * 0.04 + amplifier;
        }
        entity.takeDamage(world.getDamageSources().erosion(source), damage);
        return true;
    }

    public override shouldApplyThisTick(tickCount: number, amplifier: number): boolean {
        return tickCount % (10 - Math.min(amplifier, 6)) === 0;
    }
}