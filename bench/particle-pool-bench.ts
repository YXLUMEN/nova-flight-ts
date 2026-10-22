/**
 * ParticlePool 基准：现役（交错行 + 外挂列 + 两级门控）vs 旧版（平铺 SoA）
 *
 * 运行：
 *   浏览器: npm run dev 后访问 /bench/particle-pool-bench.html
 *   Node:   无 DOM 时降级为控制台表格（渲染一节会给 OffscreenCanvas / ctx 打桩，
 *           只测 JS 侧遍历与贴图查询，不测栅格化）
 *
 * 对照对象：
 *   A 旧版  bench/particle_support/ParticlePoolSoA.ts   15 条平铺 typed array
 *   B 现役  src/effect/particle/ParticlePool.ts         48B 交错行 + 2B meta + 按需外挂列
 *
 * 两者对外 API 一致（spawnResolve / tick / render / reset），
 * 且吃同一份确定性规格流（同一个 xorshift32 种子），所以第 2 节先做状态对拍：
 * 对拍不通过的话，后面的耗时对比没有意义。
 *
 * 测量方法（避免把噪声当成结论）：
 *   - 池子每节只建一次，每轮用 reset() 复用，不重复分配（否则 GC 会污染中位数）；
 *   - 每个 run 先热身两次再计时，取 5 次中位数；
 *   - A/B 交替测两轮，各取两轮里较小的中位数，抵消单侧偶发的停顿。
 *
 * 章节：
 *   1 环境与参数      2 状态对拍        3 tick 吞吐 vs 容量（稳态含生死）
 *   4 纯积分吞吐      5 死亡密集（swap-remove）   6 出生吞吐
 *   7 render 遍历     8 内存占用        9 新增行为的边际成本（仅现役）
 *   10 汇总
 */

import {ParticlePool} from "../src/effect/particle/ParticlePool.ts";
import type {ParticleAttr} from "../src/effect/particle/ParticleAttr.ts";
import {GravitySystem} from "../src/effect/particle/system/GravitySystem.ts";
import {ParticlePoolSoA} from "./particle_support/ParticlePoolSoA.ts";
import {Rng} from "../test/support/spatialFixtures.ts";

// ---------------------------------------------------------------------------
// 参数（与生产一致：WorldRenderer 里 new ParticlePool(1024)，主循环 60Hz）
// ---------------------------------------------------------------------------

const CAPS = [256, 1024, 4096];
const DT = 1 / 60;
const FRAMES = 240;
const RENDER_FRAMES = 60;
const REPS = 5;
const SPEC_COUNT = 4096;
const LONG_LIFE = 1e9;

/** 快照字段数：cx cy px py vx vy size rec age life c0 c1 shape rot drag */
const FIELDS = 15;

/** 生产里每种特效一组颜色对，这里取 8 组（贴图缓存在 3 形状 × 6 档 × 8 对 = 144 键内，不会抖动） */
const PALETTE = [0xFF3B30FF, 0xFF9500FF, 0xFFD60AFF, 0x34C759FF, 0x5AC8FAFF, 0xAF52DEFF, 0xFFFFFFFF, 0x8E8E93FF];

// ---------------------------------------------------------------------------
// 输出：浏览器画表 / Node 打控制台
// ---------------------------------------------------------------------------

type Cell = string | { t: string; cls?: string };

interface Sink {
    env(text: string): void;

    section(title: string, desc?: string): void;

    table(head: string[], rows: Cell[][]): void;

    note(text: string): void;
}

function createSink(): Sink {
    if (typeof document === "undefined") {
        const cellText = (c: Cell) => typeof c === "string" ? c : c.t;
        return {
            env: text => console.log(text),
            section: (title, desc) => console.log(`\n== ${title} ==${desc ? `\n   ${desc}` : ""}`),
            table: (head, rows) => {
                const all = [head, ...rows.map(r => r.map(cellText))];
                const width = head.map((_, i) => Math.max(...all.map(r => r[i]!.length)));
                for (const [index, row] of all.entries()) {
                    console.log("   " + row.map((c, i) => c.padEnd(width[i]!)).join("  "));
                    if (index === 0) console.log("   " + width.map(w => "-".repeat(w)).join("  "));
                }
            },
            note: text => console.log(`   ${text}`),
        };
    }

    const out = document.getElementById("out")!;
    return {
        env: text => {
            document.getElementById("env")!.textContent = text;
        },
        section: (title, desc) => {
            const h = document.createElement("h2");
            h.textContent = title;
            out.append(h);
            if (desc) {
                const p = document.createElement("p");
                p.className = "note";
                p.textContent = desc;
                out.append(p);
            }
        },
        table: (head, rows) => {
            const table = document.createElement("table");
            const thead = document.createElement("thead");
            const htr = document.createElement("tr");
            for (const h of head) {
                const th = document.createElement("th");
                th.textContent = h;
                htr.append(th);
            }
            thead.append(htr);
            table.append(thead);

            const tbody = document.createElement("tbody");
            for (const row of rows) {
                const tr = document.createElement("tr");
                for (const c of row) {
                    const td = document.createElement("td");
                    td.textContent = typeof c === "string" ? c : c.t;
                    if (typeof c !== "string" && c.cls) td.className = c.cls;
                    tr.append(td);
                }
                tbody.append(tr);
            }
            table.append(tbody);
            out.append(table);
        },
        note: text => {
            const p = document.createElement("p");
            p.className = "note";
            p.textContent = text;
            out.append(p);
        },
    };
}

const sink = createSink();

// ---------------------------------------------------------------------------
// 计时与格式化
// ---------------------------------------------------------------------------

const now = (): number => globalThis.performance.now();

/** 返回"每次操作"的纳秒数中位数；run() 必须返回本次执行的操作数，且自己负责复位 */
function bench(run: () => number, reps: number = REPS): number {
    run();
    run();                       // 两次热身：一次给 JIT 编译，一次让内联稳定下来
    const samples: number[] = [];
    for (let r = 0; r < reps; r++) {
        const t0 = now();
        const ops = run();
        samples.push(((now() - t0) * 1e6) / Math.max(1, ops));
    }
    samples.sort((a, b) => a - b);
    return samples[samples.length >> 1]!;
}

/** A/B 交替两轮，各取较小值，抵消单侧偶发停顿 */
function pairBench(oldRun: () => number, newRun: () => number): { oldNs: number; newNs: number } {
    const a1 = bench(oldRun);
    const b1 = bench(newRun);
    const a2 = bench(oldRun);
    const b2 = bench(newRun);
    return {oldNs: Math.min(a1, a2), newNs: Math.min(b1, b2)};
}

const fmt = (v: number, digits = 2): string => v.toFixed(digits);
const int = (v: number): string => Math.round(v).toLocaleString("en-US");

/** B/A 比值：< 1 表示现役更快 */
function ratioCell(newNs: number, oldNs: number): Cell {
    const r = newNs / oldNs;
    return {t: `${fmt(r, 2)}×`, cls: r <= 1 ? "good" : "bad"};
}

const summary: Array<{ scene: string; deltas: number[] }> = [];

// ---------------------------------------------------------------------------
// 负载：确定性规格流
// ---------------------------------------------------------------------------

interface Spec {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    shape: number;
    c0: number;
    c1: number;
    drag: number;
    rec: number;
    rot: number;
}

interface SpecOptions {
    /** 非圆形状比例（决定 rot 的占比） */
    nonCircle?: number;
    /** 带阻力比例 */
    dragRatio?: number;
    /** 寿命范围 */
    life?: [number, number];
}

function makeSpecs(rng: Rng, count: number, opt: SpecOptions = {}): Spec[] {
    const nonCircle = opt.nonCircle ?? 0.15;
    const dragRatio = opt.dragRatio ?? 0.25;
    const [lifeMin, lifeMax] = opt.life ?? [6, 60];

    const specs: Spec[] = [];
    for (let i = 0; i < count; i++) {
        const shape = rng.next() < 1 - nonCircle ? 0 : (rng.next() < 0.5 ? 1 : 2);
        const angle = rng.range(0, Math.PI * 2);
        const speed = rng.range(20, 200);
        const pair = i % PALETTE.length;

        specs.push({
            x: rng.range(0, 1760),
            y: rng.range(0, 1120),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: rng.intBetween(lifeMin, lifeMax),
            size: rng.range(1, 7),
            shape,
            c0: PALETTE[pair]!,
            c1: PALETTE[(pair + 3) % PALETTE.length]!,
            drag: rng.next() < dragRatio ? rng.range(1, 4) : 0,
            rec: rng.next() < 0.7 ? 0.6 : rng.range(0, 0.9),
            rot: shape === 0 ? 0 : rng.range(-Math.PI, Math.PI),
        });
    }
    return specs;
}

// ---------------------------------------------------------------------------
// 两个实现的最小公共接口 + 内部探针
// ---------------------------------------------------------------------------

interface Pool {
    spawnResolve(
        x: number, y: number,
        vx: number, vy: number,
        life: number, size: number,
        shape: number,
        colorFrom: number, colorTo: number,
        drag: number, recession: number, rot: number,
    ): unknown;

    tick(dt: number): void;

    render(ctx: CanvasRenderingContext2D, alpha: number): void;

    reset(): void;
}

interface PoolExt extends Pool {
    tag(index: number, attr: ParticleAttr): void;

    attach(index: number, attr: ParticleAttr, value: number): void;

    read(index: number, attr: ParticleAttr): number;

    registerSystem(system: unknown): void;
}

interface StoreProbe {
    active: number;
    f32: Float32Array;
    u32: Uint32Array;
    meta: Uint16Array;

    peek(attr: number): Float32Array | null;
}

interface SoAProbe {
    active: number;
    layout: { arrays: ArrayLike<ArrayBufferView> };
    cx: Float32Array;
    cy: Float32Array;
    px: Float32Array;
    py: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    rot: Float32Array;
    size: Float32Array;
    shape: Uint8Array;
    age: Uint32Array;
    life: Uint32Array;
    recession: Float32Array;
    drag: Float32Array;
    color0: Uint32Array;
    color1: Uint32Array;
}

const storeOf = (pool: Pool): StoreProbe => (pool as unknown as { store: StoreProbe }).store;
const soaOf = (pool: Pool): SoAProbe => pool as unknown as SoAProbe;

const ATTR_ROT = 0 as unknown as ParticleAttr;
const ATTR_DRAG = 1 as unknown as ParticleAttr;
const ATTR_GRAVITY = 2 as unknown as ParticleAttr;

function spawnSpec(pool: Pool, spec: Spec, life: number = spec.life): void {
    pool.spawnResolve(
        spec.x, spec.y, spec.vx, spec.vy,
        life, spec.size, spec.shape,
        spec.c0, spec.c1,
        spec.drag, spec.rec, spec.rot,
    );
}

// ---------------------------------------------------------------------------
// 状态快照（对拍用）
// ---------------------------------------------------------------------------

function snapshotOld(pool: Pool): Float64Array {
    const o = soaOf(pool);
    const n = o.active;
    const out = new Float64Array(n * FIELDS);

    for (let i = 0; i < n; i++) {
        const b = i * FIELDS;
        out[b] = o.cx[i]!;
        out[b + 1] = o.cy[i]!;
        out[b + 2] = o.px[i]!;
        out[b + 3] = o.py[i]!;
        out[b + 4] = o.vx[i]!;
        out[b + 5] = o.vy[i]!;
        out[b + 6] = o.size[i]!;
        out[b + 7] = o.recession[i]!;
        out[b + 8] = o.age[i]!;
        out[b + 9] = o.life[i]!;
        out[b + 10] = o.color0[i]!;
        out[b + 11] = o.color1[i]!;
        out[b + 12] = o.shape[i]!;
        out[b + 13] = o.rot[i]!;
        out[b + 14] = o.drag[i]!;
    }
    return out;
}

function snapshotNew(pool: Pool): Float64Array {
    const s = storeOf(pool);
    const f = s.f32;
    const u = s.u32;
    const meta = s.meta;
    const ext = pool as unknown as PoolExt;
    const n = s.active;
    const out = new Float64Array(n * FIELDS);

    for (let i = 0; i < n; i++) {
        const b = i * 12;
        const o = i * FIELDS;
        out[o] = f[b]!;
        out[o + 1] = f[b + 1]!;
        out[o + 2] = f[b + 2]!;
        out[o + 3] = f[b + 3]!;
        out[o + 4] = f[b + 4]!;
        out[o + 5] = f[b + 5]!;
        out[o + 6] = f[b + 6]!;
        out[o + 7] = f[b + 7]!;
        out[o + 8] = u[b + 8]!;
        out[o + 9] = u[b + 9]!;
        out[o + 10] = u[b + 10]!;
        out[o + 11] = u[b + 11]!;
        out[o + 12] = meta[i]! & 0b111;
        out[o + 13] = ext.read(i, ATTR_ROT);
        out[o + 14] = ext.read(i, ATTR_DRAG);
    }
    return out;
}

// ---------------------------------------------------------------------------
// 实现清单
// ---------------------------------------------------------------------------

interface Impl {
    key: string;
    label: string;

    make(cap: number): Pool;

    active(pool: Pool): number;

    snapshot(pool: Pool): Float64Array;

    /** 粒子相关的 typed array 总字节（不含对象头与贴图缓存） */
    bytes(pool: Pool): number;
}

const OLD: Impl = {
    key: "A",
    label: "旧版 SoA（15 条平铺列）",
    make: cap => new ParticlePoolSoA(cap) as unknown as Pool,
    active: pool => soaOf(pool).active,
    snapshot: snapshotOld,
    bytes: pool => {
        const arrays = soaOf(pool).layout.arrays;
        let total = 0;
        for (let i = 0; i < arrays.length; i++) total += arrays[i]!.byteLength;
        return total;
    },
};

const NEW: Impl = {
    key: "B",
    label: "现役（48B 交错行 + 按需外挂列）",
    make: cap => new ParticlePool(cap) as unknown as Pool,
    active: pool => storeOf(pool).active,
    snapshot: snapshotNew,
    bytes: pool => {
        const s = storeOf(pool);
        let total = s.f32.byteLength + s.meta.byteLength;
        for (const attr of [ATTR_ROT, ATTR_DRAG, ATTR_GRAVITY]) {
            const data = s.peek(attr as unknown as number);
            if (data !== null) total += data.byteLength;
        }
        return total;
    },
};

// ---------------------------------------------------------------------------
// 渲染目标
// ---------------------------------------------------------------------------

/** Node 里没有 OffscreenCanvas：打桩，让 buildSprite 走得通（只测 JS 侧成本） */
function installCanvasStub(): void {
    if (typeof OffscreenCanvas !== "undefined") return;

    class StubGradient {
        public addColorStop(): void {
        }
    }

    class StubCtx {
        public fillStyle: unknown;

        public scale(): void {
        }

        public translate(): void {
        }

        public createRadialGradient(): StubGradient {
            return new StubGradient();
        }

        public beginPath(): void {
        }

        public arc(): void {
        }

        public rect(): void {
        }

        public moveTo(): void {
        }

        public lineTo(): void {
        }

        public closePath(): void {
        }

        public fill(): void {
        }
    }

    (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas = class {
        public getContext(): StubCtx {
            return new StubCtx();
        }

        public transferToImageBitmap(): { close(): void } {
            return {close: () => void 0};
        }
    };
}

function createTarget(): { ctx: CanvasRenderingContext2D; label: string } {
    if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = 960;
        canvas.height = 540;
        return {ctx: canvas.getContext("2d")!, label: "真实 Canvas 2D"};
    }

    const noop = (): void => {
    };
    const ctx = {
        save: noop, restore: noop, translate: noop, rotate: noop,
        drawImage: noop, clearRect: noop, fillRect: noop,
    };
    return {ctx: ctx as unknown as CanvasRenderingContext2D, label: "桩 ctx（Node，不栅格化）"};
}

installCanvasStub();

// ===========================================================================
// 1 环境
// ===========================================================================

const envName = typeof document === "undefined"
    ? `Node ${((globalThis as unknown as { process?: { version?: string } }).process?.version ?? "").trim()}`
    : navigator.userAgent;
const target = createTarget();

sink.env(`环境: ${envName} ｜ 渲染: ${target.label}`);
sink.section(
    "1 环境与参数",
    `容量档 ${CAPS.join(" / ")}，dt = 1/60，每轮 ${FRAMES} 帧（渲染 ${RENDER_FRAMES} 帧），取 ${REPS} 次中位数。`
    + "负载取生产分布：寿命 6~60 tick、尺寸 1~7、15% 非圆（带 rot）、25% 带阻力、70% 用默认收缩 0.6。",
);
sink.note(`A = ${OLD.label}；B = ${NEW.label}。比值 B/A，小于 1 表示现役更快。`);

// ===========================================================================
// 2 状态对拍
// ===========================================================================

sink.section(
    "2 状态对拍",
    "两个实现吃同一批规格、同一串 dt，跑完逐粒子比对 15 个字段。对拍不过，后面的耗时对比就不可信。",
);

{
    const cap = 512;
    const specs = makeSpecs(new Rng(0xC0FFEE), 2048);
    const spawnPerFrame = 16;
    const frames = 200;

    const oldPool = OLD.make(cap);
    const newPool = NEW.make(cap);

    let cursor = 0;
    let maxActive = 0;

    for (let f = 0; f < frames; f++) {
        // 先固定本帧要发射的批次，再让两个池子吃同一批，避免各算各的
        const batch: Spec[] = [];
        for (let k = 0; k < spawnPerFrame; k++) {
            batch.push(specs[cursor++ % specs.length]!);
        }

        const pairs: Array<[Pool, Impl]> = [[oldPool, OLD], [newPool, NEW]];
        for (const [pool, impl] of pairs) {
            for (const spec of batch) {
                if (impl.active(pool) >= cap) break;
                spawnSpec(pool, spec);
            }
        }

        oldPool.tick(DT);
        newPool.tick(DT);
        maxActive = Math.max(maxActive, OLD.active(oldPool), NEW.active(newPool));
    }

    const oldActive = OLD.active(oldPool);
    const newActive = NEW.active(newPool);
    const a = OLD.snapshot(oldPool);
    const b = NEW.snapshot(newPool);

    let maxDiff = 0;
    let mismatches = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const d = Math.abs(a[i]! - b[i]!);
        if (d > maxDiff) maxDiff = d;
        if (d > 1e-6) mismatches++;
    }

    sink.table(
        ["项", "A 旧版", "B 现役", "结论"],
        [
            [
                "活跃粒子数", int(oldActive), int(newActive),
                {
                    t: oldActive === newActive ? "一致" : "不一致",
                    cls: oldActive === newActive ? "good" : "bad",
                },
            ],
            ["期间峰值粒子数", int(maxActive), int(maxActive), "同一负载"],
            ["比对字段数", int(a.length), int(b.length), "15 字段 × 活跃数"],
            ["最大绝对误差", "—", maxDiff.toExponential(1), {
                t: maxDiff <= 1e-6 ? "逐位等价" : "有漂移",
                cls: maxDiff <= 1e-6 ? "good" : "bad",
            }],
            ["超阈值字段数", "—", int(mismatches), {
                t: mismatches === 0 ? "0" : `${mismatches}`,
                cls: mismatches === 0 ? "good" : "bad",
            }],
        ],
    );
}

// ===========================================================================
// 3 tick 吞吐（稳态，含出生与死亡回收）
// ===========================================================================

sink.section(
    "3 tick 吞吐 vs 容量（稳态发射）",
    "每帧发射 容量/32 个粒子、超出容量则丢弃，随后 tick。归一化分母是 tick 实际处理的粒子数，"
    + "所以数值包含「出生 + 死亡回收 + 积分」的整帧成本。",
);

{
    const rows: Cell[][] = [];
    const ratios: number[] = [];

    for (const cap of CAPS) {
        const specs = makeSpecs(new Rng(0x1234 + cap), SPEC_COUNT);
        const spawnPerFrame = Math.max(1, Math.round(cap / 32));

        const makeRun = (impl: Impl): (() => number) => {
            const pool = impl.make(cap);
            return () => {
                pool.reset();
                let cursor = 0;
                let ops = 0;

                for (let f = 0; f < FRAMES; f++) {
                    for (let k = 0; k < spawnPerFrame && impl.active(pool) < cap; k++) {
                        spawnSpec(pool, specs[cursor++ % specs.length]!);
                    }
                    const before = impl.active(pool);
                    pool.tick(DT);
                    ops += before;
                }
                return ops;
            };
        };

        const {oldNs, newNs} = pairBench(makeRun(OLD), makeRun(NEW));

        ratios.push(newNs / oldNs);
        rows.push([int(cap), fmt(oldNs, 1), fmt(newNs, 1), ratioCell(newNs, oldNs)]);
    }

    sink.table(["容量", "A 旧版 ns/粒子帧", "B 现役 ns/粒子帧", "B/A"], rows);
    summary.push({scene: "tick 稳态（含生死）", deltas: ratios});
}

// ===========================================================================
// 4 纯积分吞吐（无出生、无死亡）
// ===========================================================================

sink.section(
    "4 纯积分吞吐",
    "池子一次性填满、寿命设为极长，之后只跑「寿命推进 + 阻尼 + 积分」，"
    + "隔离掉出生与回收，单纯比较两种布局的读写成本。",
);

{
    const rows: Cell[][] = [];
    const ratios: number[] = [];
    const frames = 120;

    for (const cap of CAPS) {
        const specs = makeSpecs(new Rng(0x2345 + cap), SPEC_COUNT);

        const makeRun = (impl: Impl): (() => number) => {
            const pool = impl.make(cap);
            return () => {
                pool.reset();
                for (let i = 0; i < cap; i++) spawnSpec(pool, specs[i % specs.length]!, LONG_LIFE);
                for (let f = 0; f < frames; f++) pool.tick(DT);
                return cap * frames;
            };
        };

        const {oldNs, newNs} = pairBench(makeRun(OLD), makeRun(NEW));

        ratios.push(newNs / oldNs);
        rows.push([int(cap), fmt(oldNs, 1), fmt(newNs, 1), ratioCell(newNs, oldNs)]);
    }

    sink.table(["容量", "A 旧版 ns/粒子帧", "B 现役 ns/粒子帧", "B/A"], rows);
    summary.push({scene: "纯积分", deltas: ratios});
}

// ===========================================================================
// 5 死亡密集（swap-remove 路径）
// ===========================================================================

sink.section(
    "5 死亡密集（swap-remove 路径）",
    "一半粒子 3 tick 短命、一半极长命，每帧把死掉的槽位补满。这是两版差异最大的路径："
    + "旧版每次搬运横跨 15 条列，现役只需一次 48B memmove + meta + 置位列。",
);

{
    const rows: Cell[][] = [];
    const ratios: number[] = [];
    const short = 3;
    const frames = 120;

    for (const cap of CAPS) {
        const specs = makeSpecs(new Rng(0x3456 + cap), SPEC_COUNT);

        const makeRun = (impl: Impl): (() => number) => {
            const pool = impl.make(cap);
            return () => {
                pool.reset();
                let spawnIndex = 0;
                let ops = 0;

                for (let i = 0; i < cap; i++) {
                    spawnSpec(pool, specs[i % specs.length]!, (spawnIndex++ & 1) === 0 ? short : LONG_LIFE);
                }

                for (let f = 0; f < frames; f++) {
                    const before = impl.active(pool);
                    pool.tick(DT);
                    ops += before;

                    while (impl.active(pool) < cap) {
                        spawnSpec(
                            pool,
                            specs[spawnIndex % specs.length]!,
                            (spawnIndex++ & 1) === 0 ? short : LONG_LIFE,
                        );
                    }
                }
                return ops;
            };
        };

        const {oldNs, newNs} = pairBench(makeRun(OLD), makeRun(NEW));

        ratios.push(newNs / oldNs);
        rows.push([int(cap), fmt(oldNs, 1), fmt(newNs, 1), ratioCell(newNs, oldNs)]);
    }

    sink.table(["容量", "A 旧版 ns/粒子帧", "B 现役 ns/粒子帧", "B/A"], rows);
    summary.push({scene: "死亡密集（搬运）", deltas: ratios});
}

// ===========================================================================
// 6 出生吞吐
// ===========================================================================

sink.section(
    "6 出生吞吐",
    "空池填满一次记一次，ns/粒子；每轮连填 4 次（reset 复用同一个池子）。"
    + "旧版每次写 15 条列；现役写 12 槽行 + 按需 attach。",
);

{
    const rows: Cell[][] = [];
    const ratios: number[] = [];
    const ROUNDS = 4;

    for (const cap of CAPS) {
        const specs = makeSpecs(new Rng(0x4567 + cap), SPEC_COUNT);

        const makeRun = (impl: Impl): (() => number) => {
            const pool = impl.make(cap);
            return () => {
                for (let round = 0; round < ROUNDS; round++) {
                    pool.reset();
                    for (let i = 0; i < cap; i++) spawnSpec(pool, specs[i % specs.length]!);
                }
                return cap * ROUNDS;
            };
        };

        const {oldNs, newNs} = pairBench(makeRun(OLD), makeRun(NEW));

        ratios.push(newNs / oldNs);
        rows.push([int(cap), fmt(oldNs, 1), fmt(newNs, 1), ratioCell(newNs, oldNs)]);
    }

    sink.table(["容量", "A 旧版 ns/粒子", "B 现役 ns/粒子", "B/A"], rows);
    summary.push({scene: "出生", deltas: ratios});
}

// ===========================================================================
// 7 render 遍历
// ===========================================================================

sink.section(
    "7 render 遍历",
    "填满后 tick 若干帧让 px≠cx，再连续渲染。两种负载：无旋转粒子（现役的池级门控可整段跳过旋转分支）"
    + "与 15% 旋转粒子（生产分布）。render 只读，池子复用，贴图缓存是热的。"
    + (typeof document === "undefined" ? " Node 下 ctx 是桩，只测 JS 侧遍历与贴图查询。" : ""),
);

{
    const rows: Cell[][] = [];
    const ratios: number[] = [];
    const cap = 1024;

    const cases: Array<{ label: string; opt: SpecOptions }> = [
        {label: "无旋转（全圆）", opt: {nonCircle: 0}},
        {label: "15% 旋转（生产分布）", opt: {nonCircle: 0.15}},
    ];

    for (const item of cases) {
        const specs = makeSpecs(new Rng(0x5678), SPEC_COUNT, item.opt);

        const makeRun = (impl: Impl): (() => number) => {
            const pool = impl.make(cap);
            for (let i = 0; i < cap; i++) spawnSpec(pool, specs[i % specs.length]!);
            for (let f = 0; f < 8; f++) pool.tick(DT);

            return () => {
                for (let f = 0; f < RENDER_FRAMES; f++) pool.render(target.ctx, 0.5);
                return cap * RENDER_FRAMES;
            };
        };

        const {oldNs, newNs} = pairBench(makeRun(OLD), makeRun(NEW));

        ratios.push(newNs / oldNs);
        rows.push([item.label, fmt(oldNs, 1), fmt(newNs, 1), ratioCell(newNs, oldNs)]);
    }

    sink.table(["负载", "A 旧版 ns/粒子", "B 现役 ns/粒子", "B/A"], rows);
    summary.push({scene: "render 遍历", deltas: ratios});
}

// ===========================================================================
// 8 内存占用
// ===========================================================================

sink.section(
    "8 内存占用",
    "只统计粒子自身的 typed array 字节（不含对象头、贴图缓存、纹理）。"
    + "「满属性」= 每个粒子都是非圆 + 带 rot + 带 drag。",
);

{
    const cap = 1024;
    const specs = makeSpecs(new Rng(0x6789), SPEC_COUNT);

    const fillPlain = (impl: Impl): Pool => {
        const pool = impl.make(cap);
        for (let i = 0; i < cap; i++) {
            const spec = specs[i % specs.length]!;
            pool.spawnResolve(spec.x, spec.y, spec.vx, spec.vy, spec.life, spec.size, 0, spec.c0, spec.c1, 0, spec.rec, 0);
        }
        return pool;
    };

    const fillFull = (impl: Impl): Pool => {
        const pool = impl.make(cap);
        for (let i = 0; i < cap; i++) {
            const spec = specs[i % specs.length]!;
            pool.spawnResolve(spec.x, spec.y, spec.vx, spec.vy, spec.life, spec.size, 2, spec.c0, spec.c1, 2.5, spec.rec, 0.7);
        }
        return pool;
    };

    const plainOld = fillPlain(OLD);
    const plainNew = fillPlain(NEW);
    const fullOld = fillFull(OLD);
    const fullNew = fillFull(NEW);

    const perParticle = (impl: Impl, pool: Pool): number => impl.bytes(pool) / cap;

    const plainDelta = perParticle(NEW, plainNew) - perParticle(OLD, plainOld);
    const fullDelta = perParticle(NEW, fullNew) - perParticle(OLD, fullOld);

    sink.table(
        ["状态", "A 旧版", "B 现役", "差额"],
        [
            [
                "无外挂属性",
                `${fmt(perParticle(OLD, plainOld), 1)} B/粒子`,
                `${fmt(perParticle(NEW, plainNew), 1)} B/粒子`,
                {t: `${fmt(plainDelta, 1)} B`, cls: plainDelta <= 0 ? "good" : "bad"},
            ],
            [
                "满属性（rot + drag 全开）",
                `${fmt(perParticle(OLD, fullOld), 1)} B/粒子`,
                `${fmt(perParticle(NEW, fullNew), 1)} B/粒子`,
                `${fmt(fullDelta, 1)} B`,
            ],
            [
                `总量（${cap} 粒子，满属性）`,
                `${fmt(OLD.bytes(fullOld) / 1024, 1)} KB`,
                `${fmt(NEW.bytes(fullNew) / 1024, 1)} KB`,
                `${fmt((NEW.bytes(fullNew) - OLD.bytes(fullOld)) / 1024, 1)} KB`,
            ],
        ],
    );

    sink.note(
        "旧版 15 条列从构造起就全量存在（每粒子 57B）；现役无属性时只要 48B 行 + 2B meta = 50B。"
        + "两个属性全开时现役是 58B —— meta 那 2B 换的是两级门控与可扩展位图，属于设计取舍。",
    );
}

// ===========================================================================
// 9 新增行为的边际成本（仅现役）
// ===========================================================================

sink.section(
    "9 新增行为的边际成本（仅现役）",
    "同一份负载（满容量、无生死、全圆），依次叠加扩展点，看每加一样东西的价格。"
    + "旧版没有对应机制：它的 drag / rot 列恒存，加行为只能改热循环。",
);

{
    const cap = 1024;
    const specs = makeSpecs(new Rng(0x789A), SPEC_COUNT, {nonCircle: 0, dragRatio: 0});
    const frames = 120;

    const makeBare = (impl: Impl): (() => number) => {
        const pool = impl.make(cap);
        return () => {
            pool.reset();
            for (let i = 0; i < cap; i++) spawnSpec(pool, specs[i % specs.length]!, LONG_LIFE);
            for (let f = 0; f < frames; f++) pool.tick(DT);
            return cap * frames;
        };
    };

    const bareOld = makeBare(OLD);
    const bareNew = makeBare(NEW);

    const systemPool = NEW.make(cap) as unknown as PoolExt;
    systemPool.registerSystem(new GravitySystem(0, 400));
    const systemRun = (): number => {
        systemPool.reset();
        for (let i = 0; i < cap; i++) {
            spawnSpec(systemPool, specs[i % specs.length]!, LONG_LIFE);
            systemPool.tag(i, ATTR_GRAVITY);
        }
        for (let f = 0; f < frames; f++) systemPool.tick(DT);
        return cap * frames;
    };

    const dragPool = NEW.make(cap) as unknown as PoolExt;
    const dragRun = (): number => {
        dragPool.reset();
        for (let i = 0; i < cap; i++) {
            spawnSpec(dragPool, specs[i % specs.length]!, LONG_LIFE);
            dragPool.attach(i, ATTR_DRAG, 2.5);
        }
        for (let f = 0; f < frames; f++) dragPool.tick(DT);
        return cap * frames;
    };

    const base = pairBench(bareOld, bareNew);
    const systemNs = Math.min(bench(systemRun), bench(systemRun));
    const dragNs = Math.min(bench(dragRun), bench(dragRun));

    sink.table(
        ["配置", "A 旧版 ns/粒子帧", "B 现役 ns/粒子帧", "B/A"],
        [
            ["裸负载（无属性）", fmt(base.oldNs, 1), fmt(base.newNs, 1), ratioCell(base.newNs, base.oldNs)],
            ["+ 标记型属性 + 一个 system（重力）", "—", fmt(systemNs, 1), `+${fmt(systemNs - base.newNs, 1)}`],
            ["+ 值型属性（全部带阻力）", "—", fmt(dragNs, 1), `+${fmt(dragNs - base.newNs, 1)}`],
        ],
    );

    sink.note("「+」列是相对裸负载的增量。场上没有粒子持有某个位时，对应 system 连调用都不会发生。");
}

// ===========================================================================
// 10 汇总
// ===========================================================================

sink.section(
    "10 汇总",
    "每个场景在各容量/负载下的 B/A 比值（以及跨档均值）。小于 1 = 现役更快。",
);

{
    const rows: Cell[][] = summary.map(item => {
        const mean = item.deltas.reduce((a, b) => a + b, 0) / item.deltas.length;
        return [
            item.scene,
            item.deltas.map(d => fmt(d, 2)).join(" / "),
            {t: `${fmt(mean, 2)}×`, cls: mean <= 1 ? "good" : "bad"},
        ];
    });

    sink.table(["场景", "各档 B/A", "均值"], rows);
    sink.note("这次重构的目标是扩展性，不是吞吐：吞吐只要不倒退到影响 1024 粒子帧预算即可。");
}
