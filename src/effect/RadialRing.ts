import type {IEffect} from "./IEffect.ts";
import type {IVec} from "../utils/math/IVec.ts";

export class RadialRing implements IEffect {
    public alive = true;

    private readonly center: IVec;
    private readonly r0: number;
    private readonly r1: number;
    private readonly life: number;
    private readonly color: string;

    private t = 0;

    public constructor(center: IVec, r0: number, r1: number, life: number, color: string) {
        this.color = color;
        this.life = life;
        this.r1 = r1;
        this.r0 = r0;
        this.center = center;
    }

    public tick(dt: number) {
        this.t += dt;
        if (this.t >= this.life) {
            this.alive = false;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        const k = Math.min(1, this.t / this.life);
        const r = this.r0 + (this.r1 - this.r0) * k;
        const alpha = 1 - k;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, (this.r1 - this.r0) * 0.04 * (1 - k));
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }
}
