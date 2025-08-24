import {StatusEffect} from "./StatusEffect.ts";
import type {Entity} from "../entity/Entity.ts";

export class BurningEffect extends StatusEffect {
    private readonly baseDps: number;

    public constructor(baseDps: number) {
        super();
        this.baseDps = baseDps;
    }

    public override applyUpdateEffect(entity: Entity, amplifier: number): boolean {
        const world = entity.getWorld();
        entity.takeDamage(world.getDamageSources().onFire(), this.baseDps * amplifier);

        return true;
    }

    public override canApplyUpdateEffect(duration: number, amplifier: number): boolean {
        const interval = Math.max(1, 50 >> amplifier);
        return duration % interval === 0;
    }
}