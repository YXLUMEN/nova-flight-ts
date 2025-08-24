import {StatusEffect} from "./StatusEffect.ts";
import type {Entity} from "../entity/Entity.ts";
import {PI2} from "../math/math.ts";
import {MutVec2} from "../math/MutVec2.ts";

export class EMCStatus extends StatusEffect {
    private cooldown = 0;

    public constructor() {
        super();
    }

    public override applyUpdateEffect(entity: Entity, _amplifier: number): boolean {
        const angle = Math.random() * PI2;
        const pos = entity.pos.add(new MutVec2(Math.cos(angle), Math.sin(angle)).mul(16));

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