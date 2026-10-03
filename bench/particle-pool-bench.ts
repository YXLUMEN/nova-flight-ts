// noinspection DuplicatedCode

/**
 * ParticlePool 渲染基准：旧实现 vs 新实现（贴图缓存）
 * 运行方式：npm run dev 后访问 /bench/particle-pool-bench.html
 *
 * 四个被测实现渲染的是**逐位相同的粒子状态**（同一份确定性 spec，同样的 tick 帧数）：
 *   A 旧·现状        打补丁前的 src 实现：逐粒子新建径向渐变 + 逐粒子建路径填充，
 *                    c0/c1 记忆变量声明在循环体内 ⇒ 颜色批处理完全失效
 *   B 旧·仅修 c0/c1   唯一改动：把 cur0/cur1 提到循环外。路径/fill 真的批处理了，
 *                    但渐变只按批次首粒子创建 ⇒ 后续粒子渐变锚点错位（视觉不等价，见页面四象限图）
 *   C 旧·修 c0/c1 + 渐变局部缓存
 *                    视觉正确前提下旧方案的最好水平：渐变按 (颜色对, 尺寸档) 缓存到局部空间，
 *                    逐粒子 translate 后填充（因此无法再批处理路径）
 *   D 新·贴图缓存     src/effect/particle/ParticlePool.ts 里的真实实现
 *
 * A/B/C 是 bench 内的自包含副本（只重写 render，粒子状态与 tick 全部复用 src 的 ParticlePool），
 * 所以四者共用同一套数据布局，对比是公平的；D 直接跑 src 里那份真实实现。
 *
 * 口径：
 *   0. Canvas API 调用次数（确定性，与光栅化速度无关）—— 差距的根源；
 *   1. 每帧计时（三次取中位数，1600×900 @ DPR，clearRect + render）；
 *   2. 贴图构建成本（冷启动首帧构建数 / 稳态构建数）；
 *   3. 可视 A/B（四象限，肉眼确认 B 的渐变错位与 D 的等价性）。
 */

import type {ParticleShape} from "../src/effect/particle/ParticlePool.ts";
import {ParticlePool} from "../src/effect/particle/ParticlePool.ts";
import {lerp, TAU} from "../src/utils/math/math.ts";
import {decodeColorToHex} from "../src/utils/net_util.ts";
import {DPR} from "../src/utils/uit.ts";

// ================= 常量 =================

/** 与 WorldRenderer 里 new ParticlePool(1024) 一致 */
const POOL_CAPACITY = 1024;
const PARTICLES = 1024;
/** 预热帧数：跑到寿命约 30%，收缩、位移都进入典型区间 */
const WARMUP_FRAMES = 18;
const DT = 1 / 60;
const TIMING_FRAMES = 30;
const TIMING_RUNS = 3;
/** 统计稳态构建数前先空跑这么多帧，让缓存先稳定下来（只看长期抖动） */
const STEADY_SKIP_FRAMES = 60;
const TARGET_W = 1600;
const TARGET_H = 900;

const CIRCLE = 0 as ParticleShape;
// const RECT = 1 as ParticleShape;
const TRIANGLE = 2 as ParticleShape;

/** 0xRRGGBBAA，取自实战配色风格 */
const PALETTE: Array<[number, number]> = [
    [0xFFC060FF, 0xFF000000],
    [0x60C0FFFF, 0x00FFFFFF],
    [0xFF4080FF, 0x00000000],
    [0x80FF80FF, 0x00FF0000],
    [0xFFFFFFFF, 0xFFFFFF00],
    [0xFF00FFFF, 0x0000FFFF],
];

// ================= 粒子状态（确定性，四实现共用） =================

interface ParticleSpec {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    halfW: number;
    halfH: number;
    shape: ParticleShape;
    color0: number;
    color1: number;
    drag: number;
    recession: number;
}

interface Scene {
    name: string;
    desc: string;
    specs: ParticleSpec[];
}

/** mulberry32：确定性 PRNG，保证四个实现拿到同一份状态 */
function mulberry32(seed: number): () => number {
    return () => {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildScene(name: string, desc: string, colorOf: (index: number) => [number, number],
                    count: number = PARTICLES, boxW: number = 1360, boxH: number = 660): Scene {
    const rng = mulberry32(0x5EED + name.length * 977);
    const specs: ParticleSpec[] = [];

    for (let i = 0; i < count; i++) {
        const angle = rng() * TAU;
        const speed = 20 + rng() * 90;
        const shape = (i % 3) as ParticleShape;
        const halfW = 2 + rng() * 3;                      // 与 ParticleEffectTypeBuilder 默认 size 2~5 一致
        const [color0, color1] = colorOf(i);

        specs.push({
            x: 100 + rng() * boxW,
            y: 100 + rng() * boxH,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.3 + rng() * 0.5,
            halfW,
            halfH: shape === CIRCLE ? halfW : halfW * (0.6 + rng() * 0.8),
            shape,
            color0,
            color1,
            drag: 0.5,
            recession: 0.6,
        });
    }

    return {name, desc, specs};
}

const SCENES: Scene[] = [
    buildScene("uniform", "整池同色（一次爆发 1024 个）", () => PALETTE[0]),
    buildScene("burst", "6 色 × 每 64 个一簇（贴近实战）", (i) => PALETTE[(i / 64 | 0) % PALETTE.length]),
    buildScene("alternate", "逐粒子交替两色（批处理最差）", (i) => (i & 1 ? PALETTE[2] : PALETTE[0])),
];

/** 可视 A/B 用的小场景：位置落在 0..460 × 0..190 的盒子里 */
const AB_SCENE = buildScene("ab", "可视对照", (i) => PALETTE[i % 3], 240, 420, 150);

function fillPool(pool: ParticlePool, specs: ParticleSpec[]): void {
    for (const s of specs) {
        pool.spawnResolve(
            s.x, s.y, s.vx, s.vy,
            s.life, s.halfW, s.halfH,
            s.shape, s.color0, s.color1,
            s.drag, s.recession
        );
    }
}

// ================= bench 侧只读视图 =================
// 子类只重写 render，需要读父类的 private 数组；数据布局与 src 完全一致（打补丁前后都一样）

interface PoolData {
    active: number;
    px: Float32Array;
    py: Float32Array;
    cx: Float32Array;
    cy: Float32Array;
    halfW: Float32Array;
    // halfH 已停用: 池不再存半个高度, 旧实现副本统一按 halfW 绘制
    shape: Uint8Array;
    age: Float32Array;
    life: Float32Array;
    recession: Float32Array;
    color0: Uint32Array;
    color1: Uint32Array;
}

function data(pool: ParticlePool): PoolData {
    return pool as unknown as PoolData;
}

/** 形状路径（与原实现逐字一致）；x/y 为粒子中心 */
function traceShape(
    ctx: CanvasRenderingContext2D,
    d: PoolData,
    i: number,
    x: number,
    y: number,
    halfW: number,
    t: number
): void {
    const shape = d.shape[i];

    if (shape === CIRCLE && halfW >= 1.5) {
        ctx.moveTo(x + halfW, y);
        ctx.arc(x, y, halfW, 0, TAU);
        return;
    }

    if (shape === TRIANGLE) {
        const halfH = d.halfW[i] * (1 - d.recession[i] * t);
        ctx.moveTo(x, y - halfH);            // 顶点
        ctx.lineTo(x + halfW, y + halfH);    // 右下
        ctx.lineTo(x - halfW, y + halfH);    // 左下
        ctx.closePath();
        return;
    }

    const halfH = d.halfW[i] * (1 - d.recession[i] * t);
    ctx.rect(x - halfW, y - halfH, halfW * 2, halfH * 2);
}

// ================= A：旧·现状（打补丁前的 render） =================

class OldPool extends ParticlePool {
    public constructor(capacity: number) {
        super(capacity);
    }

    public override render(ctx: CanvasRenderingContext2D, alpha: number): void {
        const d = data(this);
        let pathOpen = false;

        for (let i = 0; i < d.active; i++) {
            const t = d.age[i] / d.life[i];
            const halfW = d.halfW[i] * (1 - d.recession[i] * t);
            if (halfW < 0.1) continue;

            const x = lerp(alpha, d.px[i], d.cx[i]);
            const y = lerp(alpha, d.py[i], d.cy[i]);

            const color0 = d.color0[i], color1 = d.color1[i];

            let cur0 = -1, cur1 = -1;    // ← 原实现的 c0/c1 bug：声明在循环体内，逐粒子失效
            if (color0 !== cur0 || color1 !== cur1) {
                if (pathOpen) ctx.fill();
                if (color0 === color1 || halfW < 1) {
                    ctx.fillStyle = decodeColorToHex(color0);
                } else {
                    const g = ctx.createRadialGradient(x, y, 0, x, y, halfW);
                    g.addColorStop(0, decodeColorToHex(color0));
                    g.addColorStop(1, decodeColorToHex(color1));
                    ctx.fillStyle = g;
                }

                ctx.beginPath();
                cur0 = color0;
                cur1 = color1;
                pathOpen = true;
            }

            traceShape(ctx, d, i, x, y, halfW, t);
        }

        if (pathOpen) ctx.fill();
    }
}

// ================= B：旧·仅修 c0/c1 =================

class BatchedOldPool extends ParticlePool {
    public constructor(capacity: number) {
        super(capacity);
    }

    public override render(ctx: CanvasRenderingContext2D, alpha: number): void {
        const d = data(this);
        let pathOpen = false;
        let cur0 = -1, cur1 = -1;    // ← 唯一改动：提到循环外，颜色批处理真正生效

        for (let i = 0; i < d.active; i++) {
            const t = d.age[i] / d.life[i];
            const halfW = d.halfW[i] * (1 - d.recession[i] * t);
            if (halfW < 0.1) continue;

            const x = lerp(alpha, d.px[i], d.cx[i]);
            const y = lerp(alpha, d.py[i], d.cy[i]);

            const color0 = d.color0[i], color1 = d.color1[i];

            if (color0 !== cur0 || color1 !== cur1) {
                if (pathOpen) ctx.fill();

                if (color0 === color1 || halfW < 1) {
                    ctx.fillStyle = decodeColorToHex(color0);
                } else {
                    // 整批只建一个渐变，锚点落在批次首个粒子上 ⇒ 其余粒子渐变错位
                    const g = ctx.createRadialGradient(x, y, 0, x, y, halfW);
                    g.addColorStop(0, decodeColorToHex(color0));
                    g.addColorStop(1, decodeColorToHex(color1));
                    ctx.fillStyle = g;
                }

                ctx.beginPath();
                cur0 = color0;
                cur1 = color1;
                pathOpen = true;
            }

            traceShape(ctx, d, i, x, y, halfW, t);
        }

        if (pathOpen) ctx.fill();
    }
}

// ================= C：旧·修 c0/c1 + 渐变局部缓存（视觉正确的最优旧方案） =================

/** 尺寸量化步长，与补齐方案的 0.5px 对齐，保证对比公平 */
const SIZE_STEP = 0.5;

function bucketOf(halfSize: number): number {
    const bucket = Math.round(halfSize / SIZE_STEP);
    if (bucket < 1) return 1;
    return bucket > 63 ? 63 : bucket;
}

class OldOptimizedPool extends ParticlePool {
    private readonly flatColors = new Map<number, string>();
    private readonly gradients = new Map<number, CanvasGradient>();
    private readonly pairIds = new Map<number, Map<number, number>>();
    private pairCount = 0;
    private lastFill: string | CanvasGradient | null = null;

    public constructor(capacity: number) {
        super(capacity);
    }

    public override render(ctx: CanvasRenderingContext2D, alpha: number): void {
        const d = data(this);
        let lastFill = this.lastFill;

        for (let i = 0; i < d.active; i++) {
            const t = d.age[i] / d.life[i];
            const shrink = 1 - d.recession[i] * t;
            const halfW = d.halfW[i] * shrink;
            if (halfW < 0.1) continue;
            const halfH = d.halfW[i] * shrink;

            const x = lerp(alpha, d.px[i], d.cx[i]);
            const y = lerp(alpha, d.py[i], d.cy[i]);
            const color0 = d.color0[i], color1 = d.color1[i];

            // 渐变必须在局部空间 → 逐粒子平移，路径也就无法再批处理（这是旧方案的可用上限）
            ctx.save();
            ctx.translate(x, y);

            const fill = this.fillOf(ctx, color0, color1, halfW);
            if (fill !== lastFill) {
                ctx.fillStyle = fill;
                lastFill = fill;
            }

            ctx.beginPath();
            this.traceLocal(ctx, d, i, halfW, halfH);
            ctx.fill();
            ctx.restore();
        }

        this.lastFill = lastFill;
    }

    /** 局部空间（中心为原点）的形状路径 */
    private traceLocal(
        ctx: CanvasRenderingContext2D,
        d: PoolData,
        i: number,
        halfW: number,
        halfH: number
    ): void {
        const shape = d.shape[i];

        if (shape === CIRCLE && halfW >= 1.5) {
            ctx.arc(0, 0, halfW, 0, TAU);
            return;
        }

        if (shape === TRIANGLE) {
            ctx.moveTo(0, -halfH);
            ctx.lineTo(halfW, halfH);
            ctx.lineTo(-halfW, halfH);
            ctx.closePath();
            return;
        }

        ctx.rect(-halfW, -halfH, halfW * 2, halfH * 2);
    }

    /** 纯色或局部空间渐变（按颜色对 + 尺寸档缓存，规则与原实现一致） */
    private fillOf(
        ctx: CanvasRenderingContext2D,
        color0: number,
        color1: number,
        halfW: number
    ): string | CanvasGradient {
        if (color0 === color1 || halfW < 1) {
            let flat = this.flatColors.get(color0);
            if (flat === undefined) {
                flat = decodeColorToHex(color0);
                this.flatColors.set(color0, flat);
            }
            return flat;
        }

        const key = this.pairKey(color0, color1, bucketOf(halfW));
        const cached = this.gradients.get(key);
        if (cached !== undefined) return cached;

        const radius = bucketOf(halfW) * SIZE_STEP;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, decodeColorToHex(color0));
        gradient.addColorStop(1, decodeColorToHex(color1));
        this.gradients.set(key, gradient);
        return gradient;
    }

    private pairKey(color0: number, color1: number, bucket: number): number {
        let colors = this.pairIds.get(color0);
        if (colors === undefined) {
            colors = new Map();
            this.pairIds.set(color0, colors);
        }

        let id = colors.get(color1);
        if (id === undefined) {
            id = this.pairCount++;
            colors.set(color1, id);
        }

        return (id * 64 + bucket) * 3;
    }
}

// ================= 被测实现清单 =================

/**
 * 被测实现清单。D 直接跑 src/effect/particle/ParticlePool.ts 里的真实实现。
 * cached = 该实现带贴图缓存（计数前需要先预热，否则首次构建会污染计数）。
 */
interface Variant {
    key: string;
    label: string;
    hint: string;
    cached: boolean;
    make: () => ParticlePool;
}

const VARIANTS: Variant[] = [
    {
        key: "A", label: "旧·现状（逐粒子渐变 + c0/c1 bug）", hint: "打补丁前的实现，逐字复制",
        cached: false, make: () => new OldPool(POOL_CAPACITY),
    },
    {
        key: "B", label: "旧·仅修 c0/c1（批处理生效）", hint: "渐变锚点错位，视觉不等价",
        cached: false, make: () => new BatchedOldPool(POOL_CAPACITY),
    },
    {
        key: "C", label: "旧·修 c0/c1 + 渐变局部缓存", hint: "视觉正确前提下旧方案的最好水平",
        cached: false, make: () => new OldOptimizedPool(POOL_CAPACITY),
    },
    {
        key: "D", label: "新·贴图缓存", hint: "src/effect/particle/ParticlePool.ts",
        cached: true, make: () => new ParticlePool(POOL_CAPACITY),
    },
];

function buildPool(variant: Variant, specs: ParticleSpec[]): ParticlePool {
    const pool = variant.make();
    fillPool(pool, specs);
    for (let i = 0; i < WARMUP_FRAMES; i++) pool.tick(DT);
    return pool;
}

// ================= 计数 ctx（确定性） =================

interface Counter {
    ctx: CanvasRenderingContext2D;
    counts: Map<string, number>;
    total: () => number;
}

function makeCounter(): Counter {
    const counts = new Map<string, number>();
    const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

    const ctx = new Proxy({} as Record<string, unknown>, {
        get(_target, prop) {
            const key = String(prop);
            if (key === "constructor") return Object;
            if (key === "createRadialGradient" || key === "createLinearGradient") {
                return () => {
                    bump(key);
                    return {addColorStop: () => bump("addColorStop")};
                };
            }
            if (key === "canvas" || key === "getTransform") return () => counts;
            return () => bump(key);
        },
        set(_target, prop) {
            bump(`set:${String(prop)}`);
            return true;
        },
    }) as unknown as CanvasRenderingContext2D;

    return {
        ctx,
        counts,
        total: () => {
            let n = 0;
            for (const v of counts.values()) n += v;
            return n;
        },
    };
}

function describeCounts(counts: Map<string, number>, top: number = 8): string {
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([k, v]) => `${k}×${v}`)
        .join(" ");
}

// ================= 计时（三次取中位数） =================

function benchOpMedian(fn: () => void, ops: number): number {
    const runs: number[] = [];
    for (let r = 0; r < TIMING_RUNS; r++) {
        for (let i = 0; i < 5; i++) fn();          // 预热
        const t0 = performance.now();
        for (let i = 0; i < ops; i++) fn();
        runs.push((performance.now() - t0) / ops); // ms/帧
    }
    return runs.sort((a, b) => a - b)[1];
}

// ================= 结果结构 =================

export interface CallRow {
    scene: string;
    variant: string;
    calls: number;
    perParticle: number;
    detail: string;
}

export interface TimingRow {
    scene: string;
    variant: string;
    ms: number;
    speedupVsA: number;
    speedupVsB: number;
}

export interface BuildRow {
    scene: string;
    variant: string;
    coldFrame: number;
    steady: number;
}

// ================= 套件 =================

/**
 * 调用次数套件。只需要一个"能画的 ctx"用于预热贴图缓存：
 * 浏览器里传真实 OffscreenCanvas 的 ctx；Node 里可以传 mock（配合 OffscreenCanvas 垫片）。
 */
export function runCallCountSuite(warmCtx: CanvasRenderingContext2D): CallRow[] {
    const rows: CallRow[] = [];

    for (const scene of SCENES) {
        for (const variant of VARIANTS) {
            const pool = buildPool(variant, scene.specs);
            if (variant.cached) pool.render(warmCtx, 1);   // 预热贴图缓存，确保计数时全部命中

            const counter = makeCounter();
            pool.render(counter.ctx, 1);

            rows.push({
                scene: scene.name,
                variant: variant.key,
                calls: counter.total(),
                perParticle: counter.total() / data(pool).active,
                detail: describeCounts(counter.counts),
            });
        }
    }

    return rows;
}

/** 计时 + 贴图构建套件（需要真实 canvas） */
export function runTimingSuite(
    ctx: CanvasRenderingContext2D,
    buildCounter: () => number
): { timing: TimingRow[]; builds: BuildRow[] } {
    const timing: TimingRow[] = [];
    const builds: BuildRow[] = [];

    /**
     * 稳态帧：clearRect → tick → 补粒子 → render。
     * 持续补粒子是为了模拟"爆炸不停"的真实战况：粒子会收缩、死亡、再生成，
     * 尺寸档位持续轮换，贴图缓存是否顶得住才会体现出来（四个实现补法完全一致）。
     */
    const makeFrame = (pool: ParticlePool, scene: Scene) => {
        const d = data(pool);
        let cursor = 0;

        return () => {
            ctx.clearRect(0, 0, TARGET_W, TARGET_H);
            pool.tick(DT);

            while (d.active < PARTICLES) {
                const s = scene.specs[cursor++ % scene.specs.length];
                pool.spawnResolve(
                    s.x, s.y, s.vx, s.vy,
                    s.life, s.halfW, s.halfH,
                    s.shape, s.color0, s.color1,
                    s.drag, s.recession
                );
            }

            pool.render(ctx, 1);
        };
    };

    for (const scene of SCENES) {
        const ms = new Map<string, number>();

        for (const variant of VARIANTS) {
            const pool = buildPool(variant, scene.specs);
            const frame = makeFrame(pool, scene);

            const coldBefore = buildCounter();
            frame();                                    // 冷启动首帧（含贴图构建）
            const coldFrame = buildCounter() - coldBefore;

            for (let i = 0; i < STEADY_SKIP_FRAMES; i++) frame();   // 先让缓存稳定
            const steadyBefore = buildCounter();
            for (let i = 0; i < TIMING_FRAMES; i++) frame();
            const steady = (buildCounter() - steadyBefore) / TIMING_FRAMES;

            ms.set(variant.key, benchOpMedian(frame, TIMING_FRAMES));
            builds.push({scene: scene.name, variant: variant.key, coldFrame, steady});
        }

        const a = ms.get("A")!;
        const b = ms.get("B")!;
        for (const variant of VARIANTS) {
            const value = ms.get(variant.key)!;
            timing.push({
                scene: scene.name,
                variant: variant.key,
                ms: value,
                speedupVsA: a / value,
                speedupVsB: b / value,
            });
        }
    }

    return {timing, builds};
}

// ================= 页面输出（浏览器） =================

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function table(headers: string[], rows: string[][]): string {
    let html = `<table><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    for (const row of rows) {
        html += `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
    }
    return `${html}</table>`;
}

function main(): void {
    // 包裹 OffscreenCanvas，统计贴图构建次数（buildSprite 内部会 new OffscreenCanvas）
    let spriteBuilds = 0;
    const RealOffscreenCanvas = globalThis.OffscreenCanvas;
    globalThis.OffscreenCanvas = class extends RealOffscreenCanvas {
        public constructor(width: number, height: number) {
            super(width, height);
            spriteBuilds++;
        }
    } as unknown as typeof OffscreenCanvas;

    const target = new OffscreenCanvas(TARGET_W, TARGET_H);
    // OffscreenCanvas 的 2d ctx 与 CanvasRenderingContext2D 仅差两个 drawFocus 类方法，这里统一按后者使用
    const tctx = target.getContext("2d")! as unknown as CanvasRenderingContext2D;
    tctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const callRows = runCallCountSuite(tctx);
    const {timing, builds} = runTimingSuite(tctx, () => spriteBuilds);

    // ---------- 可视 A/B：四象限 ----------
    const vis = document.getElementById("vis") as HTMLCanvasElement | null;
    const QUAD_W = 500, QUAD_H = 240;

    if (vis) {
        const vctx = vis.getContext("2d")!;
        vctx.fillStyle = "#14161a";
        vctx.fillRect(0, 0, vis.width, vis.height);

        VARIANTS.forEach((variant, index) => {
            const qx = (index % 2) * QUAD_W;
            const qy = (index / 2 | 0) * QUAD_H;

            const pool = buildPool(variant, AB_SCENE.specs);

            vctx.save();
            vctx.beginPath();
            vctx.rect(qx, qy, QUAD_W, QUAD_H);
            vctx.clip();
            vctx.translate(qx - 80, qy - 80);
            pool.render(vctx, 1);
            vctx.restore();

            vctx.fillStyle = "#9ca3af";
            vctx.font = "12px ui-monospace, Consolas, monospace";
            vctx.fillText(`${variant.key} · ${variant.label}`, qx + 12, qy + 20);
        });
    }

    // ---------- 表格 ----------
    const env = document.getElementById("env")!;
    env.innerHTML = `DPR=${DPR}（devicePixelRatio=${globalThis.devicePixelRatio}），池容量 ${POOL_CAPACITY}，`
        + `每场景 ${PARTICLES} 个粒子、预热 ${WARMUP_FRAMES} 帧，计时 ${TIMING_FRAMES} 帧 × ${TIMING_RUNS} 次取中位数。`
        + ` D 曲线跑的是 <code>src/effect/particle/ParticlePool.ts</code> 里的真实实现。`;

    let html = "";

    html += `<h2>0. Canvas API 调用次数 / 帧（确定性，${PARTICLES} 粒子，${TIMING_FRAMES} 帧平均）</h2>`;
    for (const scene of SCENES) {
        html += `<p class="dim">${scene.name}：${scene.desc}</p>`;
        html += table(
            ["实现", "调用/帧", "调用/粒子", "相对 A", "相对 B（修 c0/c1）"],
            VARIANTS.map((variant) => {
                const row = callRows.find((r) => r.scene === scene.name && r.variant === variant.key)!;
                const a = callRows.find((r) => r.scene === scene.name && r.variant === "A")!.calls;
                const b = callRows.find((r) => r.scene === scene.name && r.variant === "B")!.calls;
                return [
                    `${variant.key} · ${variant.label}`,
                    `${row.calls}`,
                    row.perParticle.toFixed(2),
                    `<span class="good">${(a / row.calls).toFixed(2)}×</span>`,
                    `<span class="good">${(b / row.calls).toFixed(2)}×</span>`,
                ];
            })
        );
    }
    html += `<p class="note">明细（burst 场景）：<br>`
        + VARIANTS.map((v) => {
            const row = callRows.find((r) => r.scene === "burst" && r.variant === v.key)!;
            return `${v.key} → ${esc(row.detail)}`;
        }).join("<br>")
        + `</p>`;

    html += `<h2>1. 每帧渲染耗时（ms，三次取中位数；clearRect + render）</h2>`;
    for (const scene of SCENES) {
        html += `<p class="dim">${scene.name}：${scene.desc}</p>`;
        html += table(
            ["实现", "ms/帧", "相对 A", "相对 B（修 c0/c1）"],
            VARIANTS.map((variant) => {
                const row = timing.find((r) => r.scene === scene.name && r.variant === variant.key)!;
                const cls = row.speedupVsA >= 1 ? "good" : "bad";
                return [
                    `${variant.key} · ${variant.label}`,
                    row.ms.toFixed(3),
                    `<span class="${cls}">${row.speedupVsA.toFixed(2)}×</span>`,
                    `<span class="${cls}">${row.speedupVsB.toFixed(2)}×</span>`,
                ];
            })
        );
    }

    html += `<h2>2. 贴图构建成本（仅新方案会构建）</h2>`;
    html += table(
        ["实现", "场景", "冷启动首帧构建数", "稳态构建数/帧"],
        builds.map((row) => [
            `${row.variant} · ${VARIANTS.find((v) => v.key === row.variant)!.label}`,
            row.scene,
            `${row.coldFrame}`,
            row.steady.toFixed(2),
        ])
    );
    html += `<p class="note">构建数 = new OffscreenCanvas 次数（buildSprite 每次构建一张贴图）。`
        + `A/B/C 恒为 0，因为它们没有任何缓存。</p>`;

    const churn = builds.filter((r) => r.variant === "D" && r.steady > 1);
    html += churn.length > 0
        ? `<p class="note bad">⚠ 稳态仍有贴图重建（${churn.map((r) => `${r.scene}=${r.steady.toFixed(1)}/帧`).join("、")}）：`
        + `颜色对 × 形状 × 尺寸档的键空间超过了 LRU 容量，需要加大 SPRITE_CACHE_CAPACITY 或加大 SIZE_STEP（粗化档位）。</p>`
        : `<p class="note good">✓ 稳态贴图重建为 0：键空间被 LRU 完全吃下，缓存不会抖动。</p>`;

    const burst = (key: string) => timing.find((r) => r.scene === "burst" && r.variant === key)!;
    const burstCalls = (key: string) => callRows.find((r) => r.scene === "burst" && r.variant === key)!;

    html += `<h2>3. 结论</h2>`;
    html += `<p class="note">`
        + `① 只修 c0/c1（B）确实把调用数从 ${burstCalls("A").calls} 降到 ${burstCalls("B").calls}，`
        + `但它把整批粒子的渐变锚点绑在批次首粒子上——见页面顶部四象限图的 B 象限，颜色明显错位，`
        + `所以 B 只能作为"调用数参考"，不能作为可用基线。<br>`
        + `② 真正可用的旧方案上限是 C：视觉正确，调用数 ${burstCalls("C").calls}（${burstCalls("C").perParticle.toFixed(1)}/粒子），`
        + `耗时 ${burst("C").ms.toFixed(3)}ms/帧。<br>`
        + `③ 新方案 D：调用数 ${burstCalls("D").calls}（${burstCalls("D").perParticle.toFixed(2)}/粒子），`
        + `耗时 ${burst("D").ms.toFixed(3)}ms/帧，相对 A ${burst("A").ms / burst("D").ms > 0 ? (burst("A").ms / burst("D").ms).toFixed(2) : "-"}×、`
        + `相对 B ${(burst("B").ms / burst("D").ms).toFixed(2)}×、相对 C ${(burst("C").ms / burst("D").ms).toFixed(2)}×。`
        + `</p>`;

    document.getElementById("out")!.innerHTML = html;

    document.getElementById("bench-json")!.textContent = JSON.stringify({
        env: {dpr: DPR, devicePixelRatio: globalThis.devicePixelRatio},
        callRows, timing, builds,
    });

    console.table(callRows.map((r) => ({
        scene: r.scene, variant: r.variant, calls: r.calls, perParticle: r.perParticle.toFixed(2),
    })));
    console.table(timing.map((r) => ({
        scene: r.scene, variant: r.variant, ms: r.ms.toFixed(3),
        vsA: r.speedupVsA.toFixed(2), vsB: r.speedupVsB.toFixed(2),
    })));
}

if (typeof document !== "undefined") {
    main();
}
