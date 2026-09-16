import {StatusEffect, StatusEffectCategory} from "./StatusEffect.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import {PI2} from "../../utils/math/math.ts";

export class EMCStatus extends StatusEffect {
    public constructor() {
        super(StatusEffectCategory.HARMFUL, '#0033ff', true);
    }

    public override clientVisual(entity: LivingEntity) {
        const angle = Math.random() * PI2;
        const pos = entity.positionRef;
        const speed = 100 + Math.random() * 50;

        entity.getWorld().addParticle(
            pos.x + Math.cos(angle) * 16,
            pos.y + Math.sin(angle) * 16,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0.3, 1.5,
            '#2a83ab', undefined,
            0,
            1.5
        );
        return true;
    }

    public override shouldApplyThisTick(tickCount: number): boolean {
        return tickCount % 8 === 0;
    }
}