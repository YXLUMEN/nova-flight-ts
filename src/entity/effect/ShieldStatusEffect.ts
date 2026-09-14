import {StatusEffect, StatusEffectCategory} from "./StatusEffect.ts";
import {type LivingEntity} from "../LivingEntity.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import type {Entity} from "../Entity.ts";

export class ShieldStatusEffect extends StatusEffect {
    public constructor() {
        super(StatusEffectCategory.BENEFICIAL, '#5095ff', true);
    }

    public override applyEffectTick(_source: Entity | null, entity: LivingEntity): boolean {
        return entity.getShieldAmount() > 0;
    }

    public override clientVisual(entity: LivingEntity) {
        const world = entity.getWorld();
        const pos = entity.positionRef;
        const half = entity.getDimensions().halfWidth;

        const rad = (entity.age * 16) % 360 * (Math.PI / 180);
        const particleX = pos.x + Math.cos(rad) * half;
        const particleY = pos.y + Math.sin(rad) * half;

        const jitterX = (Math.random() - 0.5) * 0.2;
        const jitterY = (Math.random() - 0.5) * 0.2;

        const finalPos = new MutVec2(particleX + jitterX, particleY + jitterY);
        const vel = new MutVec2(
            Math.cos(rad) * 0.02 + (Math.random() - 0.5) * 0.03,
            Math.sin(rad) * 0.02 + (Math.random() - 0.5) * 0.03
        );

        world.addParticleByVec(
            finalPos,
            vel,
            1 + Math.random() * 0.5,
            2,
            "#4080FF",
            undefined,
            1,
            0.96,
        );
    }

    public onAppliedAt(entity: LivingEntity, amplifier: number) {
        super.onAppliedAt(entity, amplifier);
        entity.setShieldAmount(Math.max(entity.getShieldAmount(), 4 * (1 + amplifier)));
    }

    public override shouldApplyThisTick(): boolean {
        return true;
    }
}