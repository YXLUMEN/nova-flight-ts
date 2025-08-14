import type {Effect} from "./Effect.ts";
import {World} from "../World.ts";

export class ScreenFlash implements Effect {
    public alive = true;
    public readonly life: number;
    public readonly maxAlpha: number;
    public readonly color: string;

    private t = 0;

    constructor(life: number = 0.08, maxAlpha: number = 0.25, color: string= '#ffffff') {
        this.maxAlpha = maxAlpha;
        this.life = life;
        this.color = color;
    }

    public update(dt: number) {
        this.t += dt;
        if (this.t >= this.life) this.alive = false;
    }

    public render(ctx: CanvasRenderingContext2D) {
        const k = this.t / this.life;
        ctx.save();
        ctx.globalAlpha = (1 - k) * this.maxAlpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, World.W, World.H);
        ctx.restore();
    }
}
