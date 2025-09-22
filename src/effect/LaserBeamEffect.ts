import type {IEffect} from "./IEffect.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";

export class LaserBeamEffect implements IEffect {
    public alive = true;

    private readonly color: string;
    private readonly baseWidth: number;

    private readonly start = new MutVec2(0, 0);
    private readonly end = new MutVec2(0, 0);
    private t = 0;

    public constructor(color: string, baseWidth: number) {
        this.baseWidth = baseWidth;
        this.color = color;
    }

    public set(start: MutVec2, end: MutVec2) {
        this.start.x = start.x;
        this.start.y = start.y;
        this.end.x = end.x;
        this.end.y = end.y;
        this.t = 0; // 刷新寿命,保持常驻
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    public tick(dt: number) {
        this.t += dt;
        if (this.t > 0.15) this.alive = false;
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // 外圈柔光
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = this.baseWidth * 2.4;
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();

        // 内芯
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = this.baseWidth;
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();

        ctx.restore();
    }
}
