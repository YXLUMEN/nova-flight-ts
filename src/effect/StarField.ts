import type {StarLayer} from "../apis/IStarLayer.ts";
import type {Camera} from "../render/Camera.ts";
import {rand} from "../utils/math/math.ts";


export class StarField {
    public static readonly TWO_PI = Math.PI * 2;

    private readonly count: number;
    private readonly x: Float32Array;
    private readonly y: Float32Array;
    private readonly r: Float32Array;
    private readonly speed: Float32Array;

    private readonly layers: StarLayer[];
    private readonly margin: number;

    private readonly start: Uint32Array;
    private readonly end: Uint32Array;

    constructor(totalCount: number, layers: StarLayer[], margin: number = 8) {
        this.layers = layers;
        this.margin = margin;

        // 计算每层数量分配(固定数优先, 其余按权重)
        const counts = StarField.resolveCounts(totalCount, layers);
        this.count = counts.reduce((s, c) => s + c, 0);

        this.x = new Float32Array(this.count);
        this.y = new Float32Array(this.count);
        this.r = new Float32Array(this.count);
        this.speed = new Float32Array(this.count);

        // 计算每层的连续段范围
        this.start = new Uint32Array(layers.length);
        this.end = new Uint32Array(layers.length);
        let offset = 0;
        for (let li = 0; li < layers.length; li++) {
            this.start[li] = offset;
            offset += counts[li];
            this.end[li] = offset;
        }
    }

    private static resolveCounts(total: number, layers: StarLayer[]): number[] {
        const fixed = layers.map(l => l.count ?? 0);
        const fixedSum = fixed.reduce((s, c) => s + c, 0);
        const remain = Math.max(0, total - fixedSum);

        const weights = layers.map(l => l.weight ?? 0);
        const wSum = weights.reduce((s, w) => s + w, 0) || 1;

        // 基于权重分配余量
        const extra = weights.map(w => Math.floor(remain * (w / wSum)));
        // 把四舍五入误差向前层补齐
        let used = extra.reduce((s, c) => s + c, 0);
        for (let i = 0; used < remain && i < extra.length; i++, used++) extra[i]++;

        return layers.map((_, i) => fixed[i] + extra[i]);
    }

    public init(cam: Camera) {
        const v = cam.viewRect;
        for (let li = 0; li < this.layers.length; li++) {
            const L = this.layers[li];
            for (let i = this.start[li]; i < this.end[li]; i++) {
                this.x[i] = rand(v.left, v.right);
                this.y[i] = rand(v.top, v.bottom);
                this.r[i] = rand(L.radiusMin, L.radiusMax);
                this.speed[i] = rand(L.speedMin, L.speedMax);
            }
        }
    }

    public update(dt: number, cam: Camera) {
        const v = cam.viewRect, m = this.margin;

        for (let li = 0; li < this.layers.length; li++) {
            for (let i = this.start[li]; i < this.end[li]; i++) {
                this.y[i] += this.speed[i] * dt;

                if (this.y[i] > v.bottom + m) this.reseed(li, i, rand(v.left, v.right), v.top - m);
                if (this.x[i] < v.left - m) this.reseed(li, i, v.right + m, rand(v.top, v.bottom));
                else if (this.x[i] > v.right + m) this.reseed(li, i, v.left - m, rand(v.top, v.bottom));
            }
        }
    }

    public render(ctx: CanvasRenderingContext2D, cam: Camera) {
        const base = cam.cameraOffset;
        const view = cam.viewOffset;
        const vr = cam.viewRect;
        const m = this.margin, maxR = 2.5;

        ctx.save();
        ctx.fillStyle = "#cfe3ff";
        ctx.beginPath();

        for (let li = 0; li < this.layers.length; li++) {
            const L = this.layers[li];
            const ox = base.x * L.parallax;
            const oy = base.y * L.parallax;
            const sx = (view.x - base.x) * L.shakeFactor;
            const sy = (view.y - base.y) * L.shakeFactor;

            ctx.translate(-ox, -oy);

            for (let i = this.start[li]; i < this.end[li]; i++) {
                const px = this.x[i] + sx, py = this.y[i] + sy;
                if (px < vr.left - m - maxR || px > vr.right + m + maxR ||
                    py < vr.top - m - maxR || py > vr.bottom + m + maxR) continue;

                // 小星用 fillRect 而不是 arc
                if (this.r[i] <= 1) {
                    ctx.fillRect(px, py, 1, 1);
                } else {
                    ctx.moveTo(px + this.r[i], py);
                    ctx.arc(px, py, this.r[i], 0, StarField.TWO_PI);
                }
            }
            ctx.translate(ox, oy);
        }

        ctx.fill();
        ctx.restore();
    }

    private reseed(li: number, i: number, x: number, y: number) {
        const L = this.layers[li];
        this.x[i] = x;
        this.y[i] = y;
        this.r[i] = rand(L.radiusMin, L.radiusMax);
        this.speed[i] = rand(L.speedMin, L.speedMax);
    }
}


