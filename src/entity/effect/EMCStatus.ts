import {StatusEffect} from "./StatusEffect.ts";
import type {Entity} from "../Entity.ts";
import {PI2} from "../../utils/math/math.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

export class EMCStatus extends StatusEffect {
    private cooldown = 0;

    public constructor() {
        super(2, '#0033ff');
    }

    public override applyUpdateEffect(entity: Entity, _amplifier: number): boolean {
        const angle = Math.random() * PI2;
        const pos = entity.getMutPos.clone()
            .addVec(new MutVec2(Math.cos(angle), Math.sin(angle)).mul(16));

        const speed = 100 + Math.random() * 50;
        const vel = new MutVec2(Math.cos(angle), Math.sin(angle)).mul(speed);

        entity.getWorld().spawnParticle(
            pos, vel,
            0.3,
            1.5,
            '#66ccff', '#0033ff',
            1.5,
            0.0
        );

        return true;
    }

    public override canApplyUpdateEffect(_duration: number, _amplifier: number): boolean {
        if (this.cooldown++ < 20) return false;
        this.cooldown = 0;
        return true;
    }
}