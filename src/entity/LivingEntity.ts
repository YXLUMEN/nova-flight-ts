import {Entity} from "./Entity.ts";
import type {Vec2} from "../math/Vec2.ts";

export abstract class LivingEntity extends Entity {
    protected health: number;

    protected constructor(pos: Vec2, radius: number, health: number) {
        super(pos, radius);
        this.health = health;
    }

    public onDamage(damage: number) {
        this.health = Math.max(0, this.health - damage);
        if (this.health <= 0) this.onDeath();
    }

    public get getHealth() {
        return this.health;
    }
}