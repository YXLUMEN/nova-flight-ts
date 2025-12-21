import {StatusEffect} from "./StatusEffect.ts";
import type {Entity} from "../Entity.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class ErosionEffect extends StatusEffect {
    private readonly damage: number;

    public constructor(baseDps: number) {
        super(1, '#ff8000');
        this.damage = baseDps;
    }

    public override applyUpdateEffect(entity: Entity, amplifier: number): boolean {
        const world = entity.getWorld();
        if (world.isClient) return true;

        let damage: number = this.damage * amplifier;
        if (amplifier > 8 && entity instanceof LivingEntity) {
            damage += entity.getMaxHealth() * 0.1;
        }
        entity.takeDamage(world.getDamageSources().erosion(), damage);
        return true;
    }

    public override canApplyUpdateEffect(duration: number, _amplifier: number): boolean {
        return duration % 10 === 0;
    }
}