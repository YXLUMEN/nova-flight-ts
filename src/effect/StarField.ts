import type {StarLayer} from "../type/IStarLayer.ts";
import type {Camera} from "../client/render/Camera.ts";
import {lerp, rand} from "../utils/math/math.ts";
import {World} from "../world/World.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";

export class StarField {
    private readonly count: number;

    private readonly layers: readonly StarLayer[];
    private readonly core: Float32Array<ArrayBuffer>;

    private readonly start: Uint16Array;
    private readonly end: Uint16Array;

    private readonly lastCamPos = MutVec2.zero();
    private readonly margin: number;
    private prevDt: number = 0.05;

    public constructor(totalCount: number, layers: readonly StarLayer[], margin: number = 0) {
        this.layers = layers;
        this.margin = margin;

        // 计算每层数量分配(固定数优先, 其余按权重)
        const counts = StarField.resolveCounts(totalCount, layers);
        this.count = counts.reduce((s, c) => s + c, 0);

        this.core = new Float32Array(this.count * ROW_COUNT);

        // 计算每层的连续段范围
        this.start = new Uint16Array(layers.length);
        this.end = new Uint16Array(layers.length);
        let offset = 0;
        for (let li = 0; li < layers.length; li++) {
            this.start[li] = offset;
            offset += counts[li];
            this.end[li] = offset;
        }
    }

    public init(cam?: Camera) {
        const w = cam?.viewRect.width ?? 0;
        const h = cam?.viewRect.height ?? 0;
        const hasView = w > 0 && h > 0;
        const base = cam?.cameraOffset;

        for (let li = 0; li < this.layers.length; li++) {
            const layer = this.layers[li];
            for (let i = this.start[li], j = this.end[li]; i < j; i++) {
                const b = i * ROW_COUNT;
                if (!hasView) {
                    this.reseed(layer, b, rand(0, World.MAP_WIDTH), rand(0, World.MAP_HEIGHT));
                    continue;
                }
                const left = base!.x * layer.parallax;
                const top = base!.y * layer.parallax;
                this.reseed(layer, b, rand(left, left + w), rand(top, top + h));
            }
        }
    }

    public update(dt: number, cam: Camera) {
        const view = cam.viewRect;
        const w = view.width, h = view.height;
        const base = cam.cameraOffset;

        const shakeX = cam.viewOffset.x - base.x;
        const shakeY = cam.viewOffset.y - base.y;
        this.lastCamPos.setVec(cam.viewOffset);

        const core = this.core;
        const start = this.start, end = this.end;
        const m = this.margin;

        for (let li = 0; li < this.layers.length; li++) {
            const layer = this.layers[li];

            // 该层自己的可见矩形(层空间):
            // 屏幕坐标 = 位置 - base*parallax + shake*shakeFactor
            const left = base.x * layer.parallax - shakeX * layer.shakeFactor;
            const top = base.y * layer.parallax - shakeY * layer.shakeFactor;
            const right = left + w;
            const bottom = top + h;

            for (let i = start[li], j = end[li]; i < j; i++) {
                const b = i * ROW_COUNT;

                const y = core[b + StarIdx.Y] + core[b + StarIdx.S] * dt;
                core[b + StarIdx.Y] = y;

                // 垂直: 双向环绕
                if (y > bottom + m) {
                    this.reseed(layer, b, rand(left, right), top - m);
                    continue;
                }
                if (y < top - m) {
                    this.reseed(layer, b, rand(left, right), bottom + m);
                    continue;
                }

                // 水平: 在层空间内环绕
                const x = core[b + StarIdx.X];
                if (x < left - m) {
                    this.reseed(layer, b, right + m, rand(top, bottom));
                    continue;
                }
                if (x > right + m) {
                    this.reseed(layer, b, left - m, rand(top, bottom));
                }
            }
        }

        this.prevDt = dt;
    }


    public render(ctx: CanvasRenderingContext2D, cam: Camera, alpha: number) {
        const base = cam.cameraOffset;
        const view = cam.lastViewOffset;

        const core = this.core;
        const start = this.start, end = this.end;
        const prevDt = this.prevDt;

        ctx.save();
        ctx.fillStyle = "#CFE3FF";
        ctx.beginPath();

        for (let li = 0; li < this.layers.length; li++) {
            const layer = this.layers[li];
            const ox = base.x * layer.parallax;
            const oy = base.y * layer.parallax;
            const sx = (view.x - base.x) * layer.shakeFactor;
            const sy = (view.y - base.y) * layer.shakeFactor;

            ctx.save();
            ctx.translate(-ox, -oy);
            for (let i = start[li], j = end[li]; i < j; i++) {
                const b = i * ROW_COUNT;

                const x = core[b + StarIdx.X];
                const y = core[b + StarIdx.Y];

                const lx = lerp(alpha, x, x + sx);
                const ly = lerp(alpha, y - core[b + StarIdx.S] * prevDt, y + sy);
                const r = core[b + StarIdx.R];
                ctx.rect(lx, ly, r, r);
            }
            ctx.restore();
        }

        ctx.fill();
        ctx.restore();
    }

    private reseed(l: StarLayer, b: number, x: number, y: number) {
        const core = this.core;
        core[b + StarIdx.X] = x;
        core[b + StarIdx.Y] = y;
        core[b + StarIdx.S] = rand(l.speedMin, l.speedMax);
        core[b + StarIdx.R] = rand(l.radiusMin, l.radiusMax);
    }

    private static resolveCounts(total: number, layers: ReadonlyArray<StarLayer>): number[] {
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
}

const enum StarIdx {
    X,
    Y,
    S,
    R,
    _COUNT
}

const ROW_COUNT = StarIdx._COUNT;
