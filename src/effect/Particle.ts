import type {MutVec2} from "../utils/math/MutVec2.ts";
import type {Effect} from "./Effect.ts";
import {PI2} from "../utils/math/math.ts";

export class Particle implements Effect {
    public alive = true;

    private pos: MutVec2;
    private vel: MutVec2;
    private life: number;
    private size: number;
    private colorFrom: string;
    private colorTo: string;
    private drag;
    private gravity;

    private t = 0;

    public constructor(
        pos: MutVec2, vel: MutVec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ) {
        this.vel = vel;
        this.pos = pos;
        this.gravity = gravity;
        this.drag = drag;
        this.colorTo = colorTo;
        this.colorFrom = colorFrom;
        this.size = size;
        this.life = life;
    }

    public reset(
        pos: MutVec2, vel: MutVec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ) {
        this.pos = pos;
        this.vel = vel;
        this.life = life;
        this.size = size;
        this.colorFrom = colorFrom;
        this.colorTo = colorTo;
        this.drag = drag;
        this.gravity = gravity;
        this.t = 0;
        this.alive = true;
    }

    public update(dt: number) {
        this.t += dt;
        if (this.t >= this.life) {
            this.alive = false;
            return;
        }
        this.vel.x *= (1 - this.drag * dt);
        this.vel.y = this.vel.y * (1 - this.drag * dt) + this.gravity * dt;
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
    }

    public render(ctx: CanvasRenderingContext2D) {
        const k = this.t / this.life;
        const r = this.size * (1 - 0.6 * k);
        ctx.globalAlpha = 1 - k;
        const g = ctx.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, r);
        g.addColorStop(0, this.colorFrom);
        g.addColorStop(1, this.colorTo);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, r, 0, PI2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}
