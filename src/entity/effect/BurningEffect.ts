import {StatusEffect} from "./StatusEffect.ts";
import type {Entity} from "../Entity.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class BurningEffect extends StatusEffect {
    private readonly baseDps: number;

    public constructor(baseDps: number) {
        super();
        this.baseDps = baseDps;
    }

    public override applyUpdateEffect(entity: Entity, amplifier: number): boolean {
        const world = entity.getWorld();

        let damage: number = this.baseDps * amplifier;
        if (amplifier > 8 && entity instanceof LivingEntity) {
            damage += entity.getMaxHealth() * 0.1;
        }
        entity.takeDamage(world.getDamageSources().onFire(), damage);
        return true;
    }

    public override canApplyUpdateEffect(duration: number, _amplifier: number): boolean {
        // 有意为之
        return duration % 25 === 0;
    }
}