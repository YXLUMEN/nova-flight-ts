import type {Effect} from "./Effect.ts";
import {Vec2} from "../math/Vec2.ts";

export class LaserBeamEffect implements Effect {
    public alive = true;

    private readonly color: string;
    private readonly baseWidth: number;

    private start = new Vec2(0, 0);
    private end = new Vec2(0, 0);
    private t = 0;

    constructor(color: string, baseWidth: number) {
        this.baseWidth = baseWidth;
        this.color = color;
    }

    public set(start: Vec2, end: Vec2) {
        this.start.x = start.x;
        this.start.y = start.y;
        this.end.x = end.x;
        this.end.y = end.y;
        this.t = 0; // 刷新寿命,保持常驻
    }

    public kill() {
        this.alive = false;
    }

    public update(dt: number) {
        // 若一段时间未刷新则移除
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
