import {Entity} from "./Entity.ts";
import type {Vec2} from "../math/Vec2.ts";
import type {World} from "../World.ts";
import {clamp} from "../math/math.ts";

export abstract class LivingEntity extends Entity {
    private readonly maxHealth: number;
    private health: number;

    protected constructor(pos: Vec2, radius: number, health: number) {
        super(pos, radius);

        this.maxHealth = health;
        this.health = health;
    }

    public onDamage(world: World, damage: number) {
        this.health = Math.max(0, this.health - damage);
        if (this.health <= 0) this.onDeath(world);
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public getHealth() {
        return this.health;
    }

    public setHealth(health: number) {
        this.health = clamp(health, 0, this.maxHealth);
    }
}