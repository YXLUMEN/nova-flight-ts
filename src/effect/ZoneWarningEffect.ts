import type {VisualEffect} from "./VisualEffect.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import type {ViewRect} from "../client/render/Camera.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";
import {clamp, TAU} from "../utils/math/math.ts";

export class ZoneWarningEffect implements VisualEffect {
    private readonly mapWidth: number;
    private readonly bandHeight: number;
    private readonly edgeLine: number;
    private readonly pulsePeriod: number;

    private alive = true;
    private view: ViewRect = null!;
    private gradient: CanvasGradient | null = null;
    private gradientCtx: CanvasRenderingContext2D | null = null;

    public constructor(
        mapWidth: number,
        bandHeight: number = 88,
        edgeLine: number = 2,
        pulsePeriod: number = 2400,
    ) {
        this.mapWidth = mapWidth;
        this.bandHeight = bandHeight;
        this.edgeLine = edgeLine;
        this.pulsePeriod = pulsePeriod;
    }

    public getType(): VisualEffectType<ZoneWarningEffect> {
        return VisualEffectTypes.NONE;
    }

    public tick() {
    }

    public render(ctx: CanvasRenderingContext2D) {
        const view = this.view;
        const mapWidth = this.mapWidth;

        const x0 = clamp(view.left, 0, mapWidth);
        const x1 = clamp(view.right, 0, mapWidth);
        if (x1 <= x0) return;

        const phase = (performance.now() % this.pulsePeriod) / this.pulsePeriod;
        const pulse = 0.5 - 0.5 * Math.cos(phase * TAU);

        ctx.globalAlpha = 0.55 + 0.45 * pulse;

        ctx.fillStyle = this.getGradient(ctx);
        ctx.fillRect(x0, 0, x1 - x0, this.bandHeight);

        ctx.globalAlpha = 0.6 + 0.4 * pulse;
        ctx.fillStyle = '#ff4646';
        ctx.fillRect(x0, 0, x1 - x0, this.edgeLine);
        ctx.globalAlpha = 1;
    }

    private getGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
        if (this.gradient !== null && this.gradientCtx === ctx) return this.gradient;

        const g = ctx.createLinearGradient(0, 0, 0, this.bandHeight);
        g.addColorStop(0, 'rgba(255, 60, 60, 0.42)');
        g.addColorStop(0.55, 'rgba(255, 60, 60, 0.12)');
        g.addColorStop(1, 'rgba(255, 60, 60, 0)');

        this.gradient = g;
        this.gradientCtx = ctx;
        return g;
    }

    public shouldRender(view: ViewRect): boolean {
        this.view = view;
        return view.top <= Math.abs(this.bandHeight);
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill(): void {
        this.alive = false;
        this.view = null!;
        this.gradient = null;
        this.gradientCtx = null;
    }
}