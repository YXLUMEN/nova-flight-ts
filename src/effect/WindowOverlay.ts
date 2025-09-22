import type {IEffect} from "./IEffect.ts";

export class WindowOverlay implements IEffect {
    public alive = true;

    private readonly color: string;
    private readonly composite: GlobalCompositeOperation;
    private readonly maxAlpha: number;
    private readonly fadeIn: number;
    private readonly fadeOut: number;

    private alpha = 0;
    private state: "in" | "steady" | "out" = "in";
    private t = 0;

    public constructor(opts: {
        color: string;
        maxAlpha?: number;           // 遮罩峰值透明度(0~1)
        fadeIn?: number;             // 淡入时长(s)
        fadeOut?: number;            // 淡出时长(s)
        composite?: GlobalCompositeOperation; // 混合模式
    }) {
        this.color = opts.color;
        this.maxAlpha = opts.maxAlpha ?? 0.28;
        this.fadeIn = Math.max(0, opts.fadeIn ?? 0.15);
        this.fadeOut = Math.max(0, opts.fadeOut ?? 0.15);
        this.composite = opts.composite ?? "screen";
    }

    public tick(dt: number): void {
        if (!this.alive) return;
        this.t += dt;

        if (this.state === "in") {
            if (this.fadeIn <= 0) {
                this.alpha = this.maxAlpha;
                this.state = "steady";
                this.t = 0;
            } else {
                const k = Math.min(1, this.t / this.fadeIn);
                this.alpha = this.maxAlpha * k;
                if (k >= 1) {
                    this.state = "steady";
                    this.t = 0;
                }
            }
        } else if (this.state === "out") {
            if (this.fadeOut <= 0) {
                this.alpha = 0;
                this.alive = false;
            } else {
                const k = Math.min(1, this.t / this.fadeOut);
                this.alpha = this.maxAlpha * (1 - k);
                if (k >= 1) this.alive = false;
            }
        } else {
            this.alpha = this.maxAlpha;
        }
    }

    public end(): void {
        if (this.state === "out") return;
        this.state = "out";
        this.t = 0;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.alive || this.alpha <= 0) return;

        const canvas = ctx.canvas;
        ctx.save();

        ctx.resetTransform();
        ctx.globalCompositeOperation = this.composite;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }
}
