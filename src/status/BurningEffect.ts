import {StatusEffect} from "./StatusEffect.ts";
import type {World} from "../World.ts";
import type {Entity} from "../entity/Entity.ts";
import {MutVec2} from "../math/MutVec2.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";

export class BurningEffect extends StatusEffect {
    private readonly dps: number;

    public constructor(dps: number) {
        super();
        this.dps = dps;
    }

    public apply(world: World, entity: Entity, dt: number): void {
        if (entity instanceof LivingEntity) {
            entity.takeDamage(world.getDamageSources().onFire(), (this.dps + entity.getMaxHealth() * 0.1) * dt);
        } else {
            entity.takeDamage(world.getDamageSources().onFire(), this.dps * dt);
        }
        world.spawnParticle(
            entity.pos.clone(),
            new MutVec2((Math.random() - 0.5) * 10, -Math.random() * 20),
            0.5 + Math.random() * 0.3,
            4 + Math.random() * 2,
            'rgba(255, 140, 0, 1)',
            'rgba(255, 0, 0, 0)',
            1.5,
            30
        );
    }
}