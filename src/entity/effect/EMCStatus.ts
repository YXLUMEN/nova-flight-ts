import {StatusEffect} from "./StatusEffect.ts";
import {PI2} from "../../utils/math/math.ts";
import type {LivingEntity} from "../LivingEntity.ts";

export class EMCStatus extends StatusEffect {
    public constructor() {
        super(2, '#0033ff');
    }

    public override tickClient(entity: LivingEntity) {
        const angle = Math.random() * PI2;
        const pos = entity.positionRef;
        const speed = 100 + Math.random() * 50;

        entity.getWorld().addParticle(
            pos.x + Math.cos(angle) * 16,
            pos.y + Math.sin(angle) * 16,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0.3, 1.5,
            '#66ccff', '#0033ff',
            1.5
        );
        return true;
    }

    public override shouldApplyThisTick(duration: number): boolean {
        return duration % 8 === 0;
    }
}