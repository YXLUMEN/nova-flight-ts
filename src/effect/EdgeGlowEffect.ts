import type {Effect} from "./Effect.ts";

export interface EdgeGlowOpts {
    // 发光颜色
    color?: string;
    // 边缘向内的厚度
    thickness?: number;
    // 强度(0..1)，会乘到颜色alpha
    intensity?: number;
    // 总时长(秒)。Infinity 表示常驻
    duration?: number;
    // 淡入时长(秒)
    fadeIn?: number;
    // 淡出时长(秒)
    fadeOut?: number;
    // 是否脉冲呼吸
    pulse?: boolean;
    // 'lighter' | 'screen' | ...
    composite?: GlobalCompositeOperation;
}

export class EdgeGlowEffect implements Effect {
    public alive = true;
    private t = 0;

    private readonly opts: EdgeGlowOpts = {};

    public constructor(opts: EdgeGlowOpts = {}) {
        this.opts = opts;
        this.opts.color = this.opts.color ?? "#5ec8ff";
        this.opts.thickness = this.opts.thickness ?? 48;
        this.opts.intensity = this.opts.intensity ?? 0.8;
        this.opts.duration = this.opts.duration ?? 0.5;
        this.opts.fadeIn = this.opts.fadeIn ?? 0.06;
        this.opts.fadeOut = this.opts.fadeOut ?? 0.2;
        this.opts.pulse = this.opts.pulse ?? false;
        this.opts.composite = this.opts.composite ?? "lighter";
    }

    public tick(dt: number) {
        if (!this.alive) return;
        this.t += dt;
        const {duration} = this.opts;
        if (isFinite(duration!) && this.t >= duration!) {
            this.alive = false;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;

        const tMat = ctx.getTransform();
        // 将平移归零，但保留缩放（DPR）
        ctx.save();
        ctx.setTransform(tMat.a, tMat.b, tMat.c, tMat.d, 0, 0);

        const sx = tMat.a || 1;
        const sy = tMat.d || 1;
        const W = ctx.canvas.width / sx;
        const H = ctx.canvas.height / sy;

        const alpha = this.currentAlpha();
        if (alpha <= 0) {
            ctx.restore();
            return;
        }

        const {thickness, composite} = this.opts;
        const col = this.opts.color!;
        const th = Math.max(1, thickness!);

        ctx.globalCompositeOperation = composite!;
        ctx.globalAlpha = 1;

        // 上
        this.linearGlow(ctx, 0, 0, W, th, col, alpha, "vertical");
        // 下
        this.linearGlow(ctx, 0, H - th, W, th, col, alpha, "vertical-rev");
        // 左
        this.linearGlow(ctx, 0, 0, th, H, col, alpha, "horizontal");
        // 右
        this.linearGlow(ctx, W - th, 0, th, H, col, alpha, "horizontal-rev");

        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    private currentAlpha(): number {
        const {intensity, duration, fadeIn, fadeOut, pulse} = this.opts;
        const T = duration!;
        const aIn = fadeIn!;
        const aOut = fadeOut!;

        // 包络：淡入 -> 保持 -> 淡出
        let env = 1;
        if (isFinite(T)) {
            if (this.t < aIn) {
                const u = this.t / aIn;
                env = u * u * (3 - 2 * u); // smoothstep
            } else if (this.t > T - aOut) {
                const u = Math.max(0, (T - this.t) / aOut);
                env = u * u * (3 - 2 * u);
            } else {
                env = 1;
            }
        }

        // 脉冲：轻微呼吸
        const pulseMul = pulse ? (0.85 + 0.15 * Math.sin(this.t * 2 * Math.PI * 2)) : 1;

        return Math.max(0, Math.min(1, intensity! * env * pulseMul));
    }

    private linearGlow(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, w: number, h: number,
        color: string, a: number,
        dir: "vertical" | "vertical-rev" | "horizontal" | "horizontal-rev"
    ) {
        let grad: CanvasGradient;
        switch (dir) {
            case "vertical":
                grad = ctx.createLinearGradient(0, y, 0, y + h);
                grad.addColorStop(0, this.rgba(color, a));
                grad.addColorStop(1, this.rgba(color, 0));
                break;
            case "vertical-rev":
                grad = ctx.createLinearGradient(0, y, 0, y + h);
                grad.addColorStop(0, this.rgba(color, 0));
                grad.addColorStop(1, this.rgba(color, a));
                break;
            case "horizontal":
                grad = ctx.createLinearGradient(x, 0, x + w, 0);
                grad.addColorStop(0, this.rgba(color, a));
                grad.addColorStop(1, this.rgba(color, 0));
                break;
            case "horizontal-rev":
                grad = ctx.createLinearGradient(x, 0, x + w, 0);
                grad.addColorStop(0, this.rgba(color, 0));
                grad.addColorStop(1, this.rgba(color, a));
                break;
        }
        ctx.fillStyle = grad!;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
    }

    private rgba(hex: string, a: number): string {
        // 支持 #rgb / #rrggbb
        const s = hex.replace("#", "");
        const n = s.length === 3
            ? s.split("").map(c => c + c).join("")
            : s.padEnd(6, "0").slice(0, 6);
        const r = parseInt(n.slice(0, 2), 16);
        const g = parseInt(n.slice(2, 4), 16);
        const b = parseInt(n.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
    }
}
