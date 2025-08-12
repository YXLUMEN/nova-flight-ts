import {Game} from "../Game.ts";
import type {Vec2} from "../math/Vec2.ts";
import {Entity} from "./Entity.ts";

export class Bullet extends Entity {
    vel: Vec2;
    color = "#8cf5ff";
    owner: Entity;

    constructor(pos: Vec2, vel: Vec2, owner: Entity) {
        super(pos.clone(), 4);
        this.vel = vel.clone();
        this.owner = owner;
    }

    public update(dt: number) {
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;

        if (this.pos.y < -20 || this.pos.y > Game.H + 20 || this.pos.x < -20 || this.pos.x > Game.W + 20) {
            this.dead = true;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}