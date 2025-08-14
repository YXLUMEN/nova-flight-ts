import {LivingEntity} from "./LivingEntity.ts";
import type {Vec2} from "../math/Vec2.ts";
import {Game} from "../Game.ts";

export abstract class MobEntity extends LivingEntity {
    protected readonly worth: number;
    protected t = Math.random() * 1000;

    protected constructor(pos: Vec2, radius: number, health: number, worth: number) {
        super(pos, radius, health);
        this.worth = worth;
    }

    public override update(dt: number) {
        super.update(dt);

        dt *= this.speedMul;
        this.t += dt;
        this.pos.y += this.speed * dt;
        this.pos.x += Math.sin(this.t * 3) * 40 * dt;

        if (this.pos.y > Game.H + 40) this.dead = true;
    }

    public get getWorth(): number {
        return this.worth;
    }
}