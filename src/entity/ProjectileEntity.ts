import {Entity} from "./Entity.ts";
import type {Vec2} from "../math/Vec2.ts";
import {World} from "../World.ts";

export abstract class ProjectileEntity extends Entity {
    public color = "#8cf5ff";
    public readonly damage: number;
    public readonly owner: Entity;

    private vel: Vec2;

    public constructor(pos: Vec2, vel: Vec2, owner: Entity, damage: number, radius: number) {
        super(pos.clone(), radius);

        this.vel = vel.clone();
        this.damage = damage;
        this.owner = owner;
    }

    public override update(world: World, dt: number) {
        super.update(world, dt);

        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;

        if (this.pos.y < -20 || this.pos.y > World.H + 20 || this.pos.x < -20 || this.pos.x > World.W + 20) {
            this.dead = true;
        }
    }

    public abstract onHit(world: World): void;
}