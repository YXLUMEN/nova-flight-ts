import type {IEffect} from "./IEffect.ts";
import {PI2} from "../utils/math/math.ts";
import type {IVec} from "../utils/math/IVec.ts";

export class EMPBurst implements IEffect {
    public alive = true;
    private t = 0;

    private pos: IVec;
    private readonly radius: number;
    private readonly duration: number;
    private readonly bolts: number;
    private readonly segs: number;
    private readonly color: string;
    private readonly thickness: number;
    private readonly jitter: number;
    private readonly glow: number;
    private readonly drawRing: boolean;

    public constructor(
        pos: IVec,
        radius: number,
        duration = 0.6,
        bolts = 8,
        segs = 12,
        color = '#66ccff',
        thickness = 2,
        jitter = 0.9,
        glow = 12,
        drawRing = true
    ) {
        this.drawRing = drawRing;
        this.glow = glow;
        this.jitter = jitter;
        this.thickness = thickness;
        this.color = color;
        this.segs = segs;
        this.bolts = bolts;
        this.duration = duration;
        this.radius = radius;
        this.pos = pos
    }

    public tick(dt: number): void {
        if (!this.alive) return;
        this.t += dt;
        if (this.t >= this.duration) this.alive = false;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        const p = this.t / this.duration;
        const easeOut = 1 - (1 - p) * (1 - p);
        const rNow = this.radius * easeOut;
        const alpha = 1 - p;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.glow;

        // 冲击环
        if (this.drawRing) {
            ctx.strokeStyle = this.withAlpha(this.color, alpha * 0.6);
            ctx.lineWidth = 6 * (1 - p * 0.5);
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, rNow, 0, PI2);
            ctx.stroke();
        }

        // 电弧
        for (let b = 0; b < this.bolts; b++) {
            const a = (b / this.bolts) * PI2 + (Math.random() - 0.5) * 0.3;
            ctx.lineWidth = this.thickness;
            ctx.strokeStyle = this.withAlpha(this.color, alpha);

            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            for (let s = 1; s <= this.segs; s++) {
                const tSeg = s / this.segs;
                const r = rNow * tSeg;
                const off = (Math.random() - 0.5) * this.jitter * (this.radius * 0.1) * (1 - p);
                const nx = Math.cos(a), ny = Math.sin(a);
                const px = -ny, py = nx;
                const x = this.pos.x + nx * r + px * off;
                const y = this.pos.y + ny * r + py * off;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    private withAlpha(hex: string, a: number): string {
        const c = this.hexToRgb(hex);
        return `rgba(${c.r},${c.g},${c.b},${a.toFixed(3)})`;
    }

    private hexToRgb(hex: string) {
        const s = hex.replace('#', '');
        return {
            r: parseInt(s.slice(0, 2), 16),
            g: parseInt(s.slice(2, 4), 16),
            b: parseInt(s.slice(4, 6), 16)
        };
    }
}
