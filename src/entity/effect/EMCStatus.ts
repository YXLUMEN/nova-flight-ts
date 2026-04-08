import {StatusEffect} from "./StatusEffect.ts";
import {PI2} from "../../utils/math/math.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import type {LivingEntity} from "../LivingEntity.ts";

export class EMCStatus extends StatusEffect {
    public constructor() {
        super(2, '#0033ff');
    }

    public override tickClient(entity: LivingEntity) {
        const angle = Math.random() * PI2;
        const pos = entity.positionRef.clone()
            .add(Math.cos(angle) * 16, Math.sin(angle) * 16);

        const speed = 100 + Math.random() * 50;
        const vel = new MutVec2(Math.cos(angle), Math.sin(angle)).multiply(speed);

        entity.getWorld().addParticleByVec(
            pos, vel,
            0.3,
            1.5,
            '#66ccff', '#0033ff',
            1.5
        );
        return true;
    }

    public override shouldApplyThisTick(duration: number): boolean {
        return duration % 8 === 0;
    }
}