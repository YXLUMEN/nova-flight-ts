import {StatusEffect} from "./StatusEffect.ts";
import {type LivingEntity} from "../LivingEntity.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

export class ShieldStatusEffect extends StatusEffect {
    public override applyEffectTick(entity: LivingEntity): boolean {
        return entity.getShieldAmount() > 0;
    }

    public override tickClient(entity: LivingEntity, amplifier: number) {
        const world = entity.getWorld();
        const pos = entity.getPositionRef;

        const rad = (entity.age * 12) % 360 * (Math.PI / 180);
        const radius = 0.4 + amplifier * 0.15;
        const particleX = pos.x + Math.cos(rad) * radius;
        const particleY = pos.y + Math.sin(rad) * radius;

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
            "#AA40A0FF",
            "#4080FFFF",
            0.96,
            -0.01
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