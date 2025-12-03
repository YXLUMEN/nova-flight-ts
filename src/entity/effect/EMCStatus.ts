import {StatusEffect} from "./StatusEffect.ts";
import type {Entity} from "../Entity.ts";
import {PI2} from "../../utils/math/math.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

export class EMCStatus extends StatusEffect {
    public constructor() {
        super(2, '#0033ff');
    }

    public override applyUpdateEffect(entity: Entity, _amplifier: number): boolean {
        if (!entity.getWorld().isClient) return true;

        const angle = Math.random() * PI2;
        const pos = entity.getPositionRef.clone()
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

    public override canApplyUpdateEffect(duration: number, _amplifier: number): boolean {
        return duration % 8 === 0;
    }
}