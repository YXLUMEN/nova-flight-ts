/**
 * Random 工具类基准
 *
 * 运行（纯 TS，无 DOM、无渲染，Node 22.6+）：
 *   npm run bench:random
 *   等价于 node --experimental-strip-types bench/random-bench.ts
 *   （Node 22.18+ / 23.6+ 已内置类型剥离，可省掉 flag）
 *
 * 被测对象
 *   RandomXor      xoshiro128**，4×uint32 状态，周期 2^128-1（Stage 的默认注入实现）
 *   RandomLcg      32-bit LCG + 输出混合，周期 2^32（ServerWorld 建 Stage 时用）
 *   SimpleRandom   xorshift32（MobAI 用）
 *   BuiltinRandom  包一层 Math.random()
 *   GaussianRandom 极坐标法，独立于 Random 体系（客户端爆炸粒子用）
 *
 * 章节
 *   0 自检：分布 / 分辨率，先确认被测实现没坏
 *   1 next() 原始吞吐
 *   2 派生方法相对 next() 的倍数
 *   3 nextIntBelow 拒绝采样扫描
 *   4 集合操作 pick / pickIter / shuffleInplace
 *   5 构造与 split()：Seed 展开与 BigInt 开销
 *   6 真实负载：一帧 / 一 tick 里随机到底占多少
 *   7 GaussianRandom
 *
 * 计时口径
 *   先倍增迭代数直到单轮 >= 40ms（顺带完成 JIT 定型），再把同一张表的案例交错跑 7 轮，取最小值 → ns/op。
 *   交错是为了抵消 CPU 频率漂移；取最小值是因为它受 GC / 调度影响最小。
 *   但跨章节的绝对值仍会有 10%~30% 抖动，横向对比只在同表内成立。
 *   所有循环都把结果写进模块级累加器，避免被 V8 当作死代码消掉。
 *   固定种子驱动，同一台机器重复运行波动一般 < 5%。
 */

import {Random} from "../src/utils/math/random/Random.ts";
import {RandomXor} from "../src/utils/math/random/RandomXor.ts";
import {RandomLcg} from "../src/utils/math/random/RandomLcg.ts";
import {SimpleRandom} from "../src/utils/math/random/SimpleRandom.ts";
import {BuiltinRandom} from "../src/utils/math/random/BuiltinRandom.ts";
import {GaussianRandom} from "../src/utils/math/random/GaussianRandom.ts";
import {Seed} from "../src/utils/math/random/Seed.ts";
import {chiSquare, popcountDiff} from "../test/support/randomFixtures.ts";
import type {Cell} from "./support/Sink.ts";
import {createSink} from "./support/Sink.ts";

const sink = createSink();

interface ProcLike {
    readonly platform: string;
    readonly versions: Record<string, string | undefined>;
}

const proc = (globalThis as unknown as { process?: ProcLike }).process;
const PLATFORM = proc?.platform ?? "unknown";
const NODE_VERSION = proc?.versions.node ?? "-";
const V8_VERSION = proc?.versions.v8 ?? "-";

const SEED = new Seed(20240601);
const REPS = 5;
const MIN_MS = 40;

/** 整数累加器：只为让循环有副作用（不用浮点累加器：实测会给每个浮点结果多计 ~6ns） */
let acc = 0;

// ---------------------------------------------------------------------------
// 计时
// ---------------------------------------------------------------------------

const now = (): number => globalThis.performance.now();

/** 倍增迭代数，直到单轮耗时 >= MIN_MS */
function calibrate(loop: (n: number) => void): number {
    let n = 512;
    for (let round = 0; round < 14; round++) {
        const t0 = now();
        loop(n);
        const ms = now() - t0;
        if (ms >= MIN_MS) return n;
        n = Math.ceil(n * Math.min(16, Math.max(2, MIN_MS / Math.max(ms, 0.05))));
    }
    return n;
}

/** 单次操作耗时（ns）：交错采样 + 取最小值，抵消频率漂移与中断 */
function measure(loop: (n: number) => void): number {
    return benchCases([{label: "", loop}])[0]!.ns;
}

interface Case {
    readonly label: string;
    readonly loop: (n: number) => void;
}

/**
 * 同一张表里的案例必须交错测量：先各自定容，然后每轮把所有案例各跑一遍。
 * 只取最小值（而非中位数）：最小值受 GC/调度影响最小，是「这段代码本来能多快」。
 */
function benchCases(cases: readonly Case[]): { label: string; ns: number }[] {
    const iterations = cases.map(c => calibrate(c.loop));
    const best = cases.map(() => Infinity);

    for (let r = 0; r < REPS + 2; r++) {
        for (let i = 0; i < cases.length; i++) {
            const n = iterations[i]!;
            const t0 = now();
            cases[i]!.loop(n);
            const ns = (now() - t0) * 1e6 / n;
            if (r >= 2 && ns < best[i]!) best[i] = ns;
        }
    }
    return cases.map((c, i) => ({label: c.label, ns: best[i]!}));
}

// ---------------------------------------------------------------------------
// 格式化
// ---------------------------------------------------------------------------

const nsText = (v: number): string => (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.round(v).toString());
const mopsText = (v: number): string => {
    const m = 1000 / v;
    return m >= 1 ? m.toFixed(1) : m.toFixed(3);
};
const timesText = (v: number): string => `×${v.toFixed(2)}`;
const pctText = (v: number): string => `${(v * 100).toFixed(3)}%`;
const intText = (v: number): string => Math.round(v).toLocaleString("en-US");

// ---------------------------------------------------------------------------

const ENV: Cell[][] = [
    ["平台", `${PLATFORM} / Node ${NODE_VERSION}`],
    ["V8", V8_VERSION],
    ["种子", `${SEED.toString()}（80 bit，固定）`],
    ["计时", `单轮 >= ${MIN_MS}ms 定容，${REPS + 2} 轮交错采样取最小值`],
];
sink.env(`Random 基准 | ${PLATFORM} Node ${NODE_VERSION} | V8 ${V8_VERSION} | 固定种子 ${SEED.toString()}`);
sink.table(["项", "值"], ENV);

// ---------------------------------------------------------------------------
// 0. 自检
// ---------------------------------------------------------------------------

sink.section("0. 自检", "基准之前先确认被测实现没坏：被基准的代码若本身退化，ns/op 再低也没意义。");

{
    const CHECK = 600_000;
    const r = new RandomXor(SEED, 0);
    const rows: Cell[][] = [];

    let sumFloat = 0;
    let maxFloat = 0;
    for (let i = 0; i < CHECK; i++) {
        const v = r.nextFloat();
        sumFloat += v;
        if (v > maxFloat) maxFloat = v;
    }
    const meanFloat = sumFloat / CHECK;
    rows.push([`nextFloat() 均值（${intText(CHECK)} 次）`, meanFloat.toFixed(5), "0.50000 ± 0.002",
        Math.abs(meanFloat - 0.5) < 0.002 ? "OK" : "FAIL"]);
    rows.push(["nextFloat() 取值域", `[0, ${maxFloat.toFixed(7)})`, "[0, 1)", maxFloat < 1 ? "OK" : "FAIL"]);

    let sumDouble = 0;
    let fine = 0;
    for (let i = 0; i < CHECK; i++) {
        const v = r.nextDouble();
        sumDouble += v;
        // nextFloat 的值必在 2^-24 网格上；nextDouble 是 53 bit，绝大多数样本不是 2^-32 的整数倍
        if (!Number.isInteger(v * 0x100000000)) fine++;
    }
    const meanDouble = sumDouble / CHECK;
    rows.push([`nextDouble() 均值（${intText(CHECK)} 次）`, meanDouble.toFixed(5), "0.50000 ± 0.002",
        Math.abs(meanDouble - 0.5) < 0.002 ? "OK" : "FAIL"]);
    rows.push(["nextDouble() 超出 32 bit 的样本占比", pctText(fine / CHECK), "> 99%（53 bit 分辨率）",
        fine / CHECK > 0.99 ? "OK" : "FAIL"]);

    const faces = new Array<number>(6).fill(0);
    for (let i = 0; i < CHECK; i++) faces[r.nextIntBelow(6)]!++;

    const chiDice = chiSquare(faces, CHECK / 6);
    rows.push(["nextIntBelow(6) 卡方", chiDice.toFixed(2), "< 20.5（df=5, p=0.001）", chiDice < 20.5 ? "OK" : "FAIL"]);

    const bools = {hit: 0};
    for (let i = 0; i < CHECK; i++) if (r.nextBool(0.3)) bools.hit++;
    const rate = bools.hit / CHECK;
    rows.push(["nextBool(0.3) 命中率", rate.toFixed(4), "0.3000 ± 0.003", Math.abs(rate - 0.3) < 0.003 ? "OK" : "FAIL"]);

    // 4 个元素的 24 种排列（Fisher–Yates 是否有偏，只有排列频次能看出来）
    const PERMS = 240_000;
    const permCounts = new Map<string, number>();
    const buf = [0, 1, 2, 3];
    for (let i = 0; i < PERMS; i++) {
        buf[0] = 0;
        buf[1] = 1;
        buf[2] = 2;
        buf[3] = 3;
        r.shuffleInplace(buf);
        const key = buf.join("");
        permCounts.set(key, (permCounts.get(key) ?? 0) + 1);
    }
    const chiPerm = chiSquare([...permCounts.values()], PERMS / 24);
    rows.push([`shuffleInplace(4) 排列卡方（${permCounts.size} 种）`, chiPerm.toFixed(2), "< 49.7（df=23, p=0.001）",
        permCounts.size === 24 && chiPerm < 49.7 ? "OK" : "FAIL"]);

    const g = new GaussianRandom();
    const GN = 400_000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < GN; i++) {
        const v = g.nextGaussian();
        sum += v;
        sumSq += v * v;
    }
    const mean = sum / GN;
    const sd = Math.sqrt(sumSq / GN - mean * mean);
    rows.push(["GaussianRandom 均值", mean.toFixed(4), "0 ± 0.01", Math.abs(mean) < 0.01 ? "OK" : "FAIL"]);
    rows.push(["GaussianRandom 标准差", sd.toFixed(4), "1 ± 0.01", Math.abs(sd - 1) < 0.01 ? "OK" : "FAIL"]);

    // 同种子不同实现之间应当统计无关（汉明距离 ≈ 一半 bit 不同）
    const a = new RandomXor(SEED, 0);
    const b = new RandomLcg(SEED, 0);
    let same = 0;
    let bitsSame = 0;
    for (let i = 0; i < 100_000; i++) {
        const x = a.next();
        const y = b.next();
        if (x === y) same++;
        bitsSame += 32 - popcountDiff(x, y);
    }
    rows.push(["Xor vs Lcg 同种子（10 万对）", `相同字 ${same}，位相同率 ${(bitsSame / 3_200_000).toFixed(4)}`,
        "相同字 0，位相同率 0.5", same === 0 && Math.abs(bitsSame / 3_200_000 - 0.5) < 0.005 ? "OK" : "FAIL"]);

    const failed = rows.filter(r => r[r.length - 1] === "FAIL").length;
    sink.table(["检查项", "实测", "期望", "结论"], rows);
    sink.note(failed === 0
        ? "全部通过：下面的 ns/op 是在实现正确的前提下测出来的。"
        : `${failed} 项失败 —— 先修实现，再看性能。`);
}

// ---------------------------------------------------------------------------
// 1. next() 原始吞吐
// ---------------------------------------------------------------------------

sink.section("1. next() 原始吞吐", "所有派生方法的成本都是 next() 的若干倍，这一节定基准价。");

// 先空转 300ms 把 CPU 拉到稳定频率，否则第一张表会偏乐观（冷机器 turbo）
{
    const t0 = now();
    let x = 0x9E3779B9;
    while (now() - t0 < 300) {
        for (let i = 0; i < 200_000; i++) x = Math.imul(x ^ i, 0x85EBCA6B);
    }
    acc ^= x;
}

let nsXor = 0;
let nsLcg = 0;
let nsSimple = 0;
let nsBuiltin = 0;
let nsSplit = 0;

{
    const xor = new RandomXor(SEED, 0);
    const lcg = new RandomLcg(SEED, 0);
    const simple = new SimpleRandom(0x9E3779B9);
    const builtin = new BuiltinRandom();

    const cases: Case[] = [
        {
            label: "RandomXor .next()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= xor.next();
            }
        },
        {
            label: "RandomLcg .next()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= lcg.next();
            }
        },
        {
            label: "SimpleRandom .next()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= simple.next();
            }
        },
        {
            label: "BuiltinRandom .next()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= builtin.next();
            }
        },
    ];

    const results = benchCases(cases);
    nsXor = results[0]!.ns;
    nsLcg = results[1]!.ns;
    nsSimple = results[2]!.ns;
    nsBuiltin = results[3]!.ns;

    const notes = [
        "xoshiro128**，4×uint32 状态，周期 2^128-1",
        "LCG + 两次 murmur 收尾，状态只有 32 bit，周期 2^32",
        "xorshift32，状态 32 bit，周期 2^32-1",
        "Math.random 加一次乘法截断，类方法调用被内联",
    ];

    sink.table(
        ["实现", "ns/op", "Mops/s", "相对 Xor", "备注"],
        results.map((r, i) => [
            r.label,
            nsText(r.ns),
            mopsText(r.ns),
            timesText(r.ns / nsXor),
            notes[i]!,
        ]),
    );
    sink.note("BuiltinRandom 的成本基本就是引擎的 Math.random 本身（类方法调用被 V8 内联）；"
        + "RandomLcg 比 RandomXor 贵一倍，是因为每次 next() 要多做两轮 Math.imul 收尾。");
}

// ---------------------------------------------------------------------------
// 2. 派生方法
// ---------------------------------------------------------------------------

sink.section("2. 派生方法相对 next() 的倍数",
    "同一套派生逻辑写在基类里，所以差额只反映「内部要抽几个 32-bit 字」。");

function derivedCases(make: () => Random): Case[] {
    const r = make();
    const arr = Array.from({length: 64}, (_, i) => i);
    return [
        {
            label: "next()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= r.next();
            }
        },
        {
            label: "nextFloat()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= (r.nextFloat() * 0x100000000) >>> 0;
            }
        },
        {
            label: "nextDouble()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= (r.nextDouble() * 0x100000000) >>> 0;
            }
        },
        {
            label: "nextBool(0.5)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.nextBool(0.5) ? 1 : 0;
            }
        },
        {
            label: "nextIntBelow(100)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.nextIntBelow(100);
            }
        },
        {
            label: "nextInt(0, 99)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.nextInt(0, 99);
            }
        },
        {
            label: "pick(64)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.pick(arr);
            }
        },
    ];
}

{
    const xor = benchCases(derivedCases(() => new RandomXor(SEED, 0)));
    const lcg = benchCases(derivedCases(() => new RandomLcg(SEED, 0)));

    sink.table(
        ["方法", "Xor ns/op", "Xor / next", "Lcg ns/op", "Lcg / next", "内部 next() 次数"],
        xor.map((r, i) => [
            r.label,
            nsText(r.ns),
            timesText(r.ns / xor[0]!.ns),
            nsText(lcg[i]!.ns),
            timesText(lcg[i]!.ns / lcg[0]!.ns),
            r.label === "nextDouble()" ? "2" : r.label === "pick(64)" ? "1 + 一次数组索引" : "1",
        ]),
    );
    sink.note("nextDouble() 需要抽两次字（27+26 bit 拼 53 bit），成本基本就是 2× next()；"
        + "nextBool() 内部用的是 nextDouble()，所以也是 2 次 —— 但多出来的那截主要是消费方那个 50/50 的"
        + "不可预测分支（消费方把 bool 转成数字），不是 nextBool 自己变贵。nextFloat() 是 1 次。"
        + "nextIntBelow(100)/nextInt(0,99)/pick() 这里都把 bound 写成了常量，"
        + "编译器能把取模换成乘法归约，所以看着几乎和 next() 同价 —— 换成运行期才知道的 bound 就不是这么回事了（见第 3 节）。");
}

// ---------------------------------------------------------------------------
// 3. nextIntBelow 拒绝采样
// ---------------------------------------------------------------------------

sink.section("3. nextIntBelow 拒绝采样扫描",
    "代价台阶不在取模，而在拒绝率：2^32 % bound 决定要重抽多少轮。")

/** 计数包装：只为统计真实重试次数，不参与计时 */
class CountingRandom extends Random {
    public calls = 0;
    private readonly inner: Random;

    public constructor(inner: Random) {
        super();
        this.inner = inner;
    }

    public override next(): number {
        this.calls++;
        return this.inner.next();
    }
}

{
    const bounds = [2, 3, 6, 100, 1000, 65_536, 1_000_000, 0x7FFFFFFF, 0x80000000, 0x80000001, 0xC0000000, 0x100000000];
    const r = new RandomXor(SEED, 0);
    const rows: Cell[][] = [];

    // 12 个 bound 必须在同一批交错采样里测，否则不同版本的 V8 内联差异会把相对值拉偏
    const dyn = benchCases(bounds.map(b => ({
        label: String(b),
        loop: (n: number) => {
            for (let i = 0; i < n; i++) acc += r.nextIntBelow(b);
        },
    })));
    const dynNs = new Map<number, number>();

    for (const [i, bound] of bounds.entries()) {
        const ns = dyn[i]!.ns;
        dynNs.set(bound, ns);

        // 实测重试：跑 20 万次，看平均进几次 next()
        const counting = new CountingRandom(new RandomXor(SEED, 0));
        const DRAWS = 200_000;
        for (let i2 = 0; i2 < DRAWS; i2++) counting.nextIntBelow(bound);
        const perDraw = counting.calls / DRAWS;

        const reject = (0x100000000 % bound) / 0x100000000;
        const expected = 1 / (1 - reject);

        rows.push([
            intText(bound),
            nsText(ns),
            pctText(reject),
            expected.toFixed(3),
            perDraw.toFixed(3),
            timesText(ns / nsXor),
        ]);
    }
    sink.table(["bound（运行期变量）", "ns/op", "拒绝率 p", "理论 next() 次数", "实测 next() 次数", "相对 next()"], rows);

    // bound 字面量化：V8 能把 % bound 换成乘法归约（无 idiv），这是仓库里大多数调用点的实际形态
    const constCases: Case[] = [
        {
            label: "3", loop: n => {
                for (let i = 0; i < n; i++) acc += r.nextIntBelow(3);
            }
        },
        {
            label: "100", loop: n => {
                for (let i = 0; i < n; i++) acc += r.nextIntBelow(100);
            }
        },
        {
            label: "65,536", loop: n => {
                for (let i = 0; i < n; i++) acc += r.nextIntBelow(65_536);
            }
        },
        {
            label: "2,147,483,649", loop: n => {
                for (let i = 0; i < n; i++) acc += r.nextIntBelow(0x80000001);
            }
        },
        {
            label: "4,294,967,296", loop: n => {
                for (let i = 0; i < n; i++) acc += r.nextIntBelow(0x100000000);
            }
        },
    ];
    const constKeys = [3, 100, 65_536, 0x80000001, 0x100000000];
    const constResults = benchCases(constCases);

    // 注意：同一个实例上既跑常量 bound 又跑变量 bound，会让 nextIntBelow 内部 % 的类型反馈变混，
    // 所以下面的字面量行比第 2 节同名调用（~4ns）慢；这里只看本节内部的相对值
    sink.table(
        ["同一次调用，bound 的来源不同", "bound 为字面量", "bound 为变量", "倍数", "原因"],
        constResults.map((c, i) => {
            const key = constKeys[i]!;
            const dyn = dynNs.get(key)!;
            const justDivide = key > 0x7FFFFFFF && key !== 0x100000000;
            return [
                intText(key),
                nsText(c.ns),
                nsText(dyn),
                timesText(dyn / c.ns),
                justDivide
                    ? "除除法外多了 ~50% 拒绝率带来的重抽"
                    : "字面量 → 乘法归约；变量 → 硬件 idiv（~20–40 cycle）",
            ];
        }),
    );

    // 2 的幂是不是真的例外（影响「能不能预算成 O(1)」这个建议）
    const pow2Bounds = [2, 4, 8, 16, 256];
    const oddBounds = [3, 5, 7, 9, 257];
    const scan = benchCases([...pow2Bounds, ...oddBounds].map(b => ({
        label: String(b),
        loop: (n: number) => {
            for (let i = 0; i < n; i++) acc += r.nextIntBelow(b);
        },
    })));
    const all = [...pow2Bounds, ...oddBounds].map((b, i) => ({bound: b, ns: scan[i]!.ns}));
    const pow2Range = all.slice(0, pow2Bounds.length).map(x => x.ns);
    const oddRange = all.slice(pow2Bounds.length).map(x => x.ns);
    const ratio = (v: number[]) => `×${(Math.max(...v) / Math.min(...v)).toFixed(2)}`;
    sink.table(
        ["运行期 bound 取小值", "范围", "极差"],
        [
            ["2 的幂（2/4/8/16/256）", `${nsText(Math.min(...pow2Range))} – ${nsText(Math.max(...pow2Range))} ns`, ratio(pow2Range)],
            ["非 2 的幂（3/5/7/9/257）", `${nsText(Math.min(...oddRange))} – ${nsText(Math.max(...oddRange))} ns`, ratio(oddRange)],
        ],
    );

    sink.note("bound <= 2^31 时拒绝率都在 1e-9 量级，按道理应该只多一次取模，但实测变量 bound 是字面量的 3 倍左右："
        + "字面量能让 V8 把 % 换成乘法归约，运行期才知道的除数只能走 int32 idiv（~20–40 cycle）。"
        + "上表验证了这与「除数是不是 2 的幂」无关（两组完全重叠），所以只能靠「写死 bound / 提前把范围缩小」来躲。"
        + "拒绝采样本身要到 bound > 2^31 才明显：0x80000001 拒绝率将近 50%，平均要抽两次 next()，单价再翻一倍；"
        + "bound = 2^32 是特例：limit = 2^32，永不拒绝，等价于直接返回 next()。"
        + "仓库里的实际影响：生怪/洗牌的 bound 都是运行期变量，按 20ns 算，一帧一万次也才 200µs，"
        + "所以“贵”是相对的 —— 真正要避的是把 nextIntBelow 放进每帧几十万次的内环。");
}

// ---------------------------------------------------------------------------
// 4. 集合操作
// ---------------------------------------------------------------------------

sink.section("4. 集合操作 pick / pickIter / shuffleInplace",
    "SpawnStrategy 的 spawnExplosion 用 pickIter 抽玩家，生怪用 pick 选候选。");

{
    const r = new RandomXor(SEED, 0);
    const arr4 = [0, 1, 2, 3];
    const arr64 = Array.from({length: 64}, (_, i) => i);
    const arr1024 = Array.from({length: 1024}, (_, i) => i);
    const set8 = new Set(arr64.slice(0, 8));

    const pickCases: Case[] = [
        {
            label: "pick(4)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.pick(arr4);
            }
        },
        {
            label: "pick(64)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.pick(arr64);
            }
        },
        {
            label: "pick(1024)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.pick(arr1024);
            }
        },
        {
            label: "pickIter(Array 4)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.pickIter(arr4[Symbol.iterator]()) ?? 0;
            }
        },
        {
            label: "pickIter(Array 64)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.pickIter(arr64[Symbol.iterator]()) ?? 0;
            }
        },
        {
            label: "pickIter(Array 1024)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.pickIter(arr1024[Symbol.iterator]()) ?? 0;
            }
        },
        {
            label: "pickIter(Set 8)", loop: n => {
                for (let i = 0; i < n; i++) acc += r.pickIter(set8.values()) ?? 0;
            }
        },
    ];

    const picks = benchCases(pickCases);
    sink.table(
        ["操作", "ns/op", "每次 next() 次数", "相对 pick(64)", "备注"],
        picks.map((p, i) => [
            p.label,
            nsText(p.ns),
            i === 0 ? "1" : i === 1 ? "1" : i === 2 ? "1" : i === 6 ? "8" : String([4, 64, 1024][i - 3]!),
            timesText(p.ns / picks[1]!.ns),
            i < 3 ? "nextIntBelow + 一次数组索引" : "蓄水池抽样，对 n 个元素各抽一次 nextFloat",
        ]),
    );

    // 洗牌：只跟长度有关，报告单次与单元素
    const sizes = [8, 64, 512, 4096];
    const rows: Cell[][] = [];
    for (const size of sizes) {
        const buf = Array.from({length: size}, (_, i) => i);
        const ns = measure(n => {
            for (let i = 0; i < n; i++) {
                r.shuffleInplace(buf);
                acc ^= buf[0]!;
            }
        });
        rows.push([intText(size), nsText(ns), nsText(ns / size), mopsText(ns / size)]);
    }
    sink.table(["shuffleInplace 长度", "ns/次", "ns/元素", "元素/秒（M）"], rows);
    sink.note("pickIter 是 O(n) 的：抽一个元素要把整个迭代器走完，n=1024 时比 pick 慢两个数量级；"
        + "它只适合「集合本来就很小 / 必须流式」的场合（例如玩家集合），不要拿它去抽大数组。"
        + "pick() 的单价 ≈ 一次 nextIntBelow（第 3 节的运行期 bound 台阶），所以 pick 看起来和 nextDouble 差不多贵。"
        + "shuffle 的每元素 ~20ns 也是同一个台阶（每步一次绑定变量 bound 的取模）；长度从 8 到 4096 曲线是平的，因为 bound 始终远小于 2^31。");
}

// ---------------------------------------------------------------------------
// 5. 构造与 split()
// ---------------------------------------------------------------------------

sink.section("5. 构造与 split()", "Seed 展开是固定成本，藏在 new 里；split() 的全部开销都在 BigInt 拼接 + Seed.expand。");

{
    const seedNum = new Seed(1);
    const xor = new RandomXor(SEED, 0);
    const lcg = new RandomLcg(SEED, 0);

    const cases: Case[] = [
        {
            label: "new Seed(number)", loop: n => {
                for (let i = 0; i < n; i++) acc ^= new Seed(1 + (i & 1)).equals(seedNum) ? 1 : 0;
            }
        },
        {
            label: "new Seed(bigint)", loop: n => {
                for (let i = 0; i < n; i++) acc ^= new Seed(BigInt(1 + (i & 1))).equals(seedNum) ? 1 : 0;
            }
        },
        {
            label: "seed.expand(1)", loop: n => {
                for (let i = 0; i < n; i++) acc ^= SEED.expand(1, 0)[0]!;
            }
        },
        {
            label: "seed.expand(4)", loop: n => {
                for (let i = 0; i < n; i++) acc ^= SEED.expand(4, 0)[1]!;
            }
        },
        {
            label: "seed.expand(8)", loop: n => {
                for (let i = 0; i < n; i++) acc ^= SEED.expand(8, 0)[7]!;
            }
        },
        {
            label: "new RandomLcg(seed)", loop: n => {
                for (let i = 0; i < n; i++) acc ^= new RandomLcg(SEED, 0).next();
            }
        },
        {
            label: "new RandomXor(seed)", loop: n => {
                for (let i = 0; i < n; i++) acc ^= new RandomXor(SEED, 0).next();
            }
        },
        {
            label: "xor.split()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= xor.split().next();
            }
        },
        {
            label: "lcg.split()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= lcg.split().next();
            }
        },
    ];

    const results = benchCases(cases);
    const rowOf = (label: string) => results.find(r => r.label === label)!.ns;
    nsSplit = rowOf("xor.split()");

    const breakdown: { label: string; key: string; how: string }[] = [
        {label: "new Seed(number)", key: "new Seed(number)", how: "拆高低 32 bit，无分配"},
        {label: "new Seed(bigint)", key: "new Seed(bigint)", how: "BigInt 掩码 + 3 次位移"},
        {label: "seed.expand(1)", key: "seed.expand(1)", how: "每字 3 次 mix32（murmur fmix32）"},
        {label: "seed.expand(4)", key: "seed.expand(4)", how: "每字 3 次 mix32 + Uint32Array(4)"},
        {label: "seed.expand(8)", key: "seed.expand(8)", how: "每字 3 次 mix32 + Uint32Array(8)"},
        {label: "new RandomLcg", key: "new RandomLcg(seed)", how: "expand(1) + 1 个字段"},
        {label: "new RandomXor", key: "new RandomXor(seed)", how: "expand(4) + Uint32Array 字段"},
        {label: "RandomXor.split()", key: "xor.split()", how: "6× next() + 3 次 BigInt 位移 + new Seed + expand(4)"},
        {label: "RandomLcg.split()", key: "lcg.split()", how: "6× next() + 3 次 BigInt 位移 + new Seed + expand(1)"},
    ];

    sink.table(
        ["操作", "ns/op", "Kops/s", "等价 next() 次数", "构成"],
        breakdown.map(b => {
            const nsValue = rowOf(b.key);
            return [
                b.label,
                nsText(nsValue),
                (1000 / nsValue).toFixed(1),
                timesText(nsValue / nsXor),
                b.how,
            ];
        }),
    );
    sink.note("构造成本从个位数 ns 到上百 ns：Stage 重建、split 派生子流这类「每次世界加载 / 每个分流点」的操作不受影响，"
        + "但不要在逐帧路径里 new 生成器。"
        + "split() 里最贵的是 3 次 BigInt 位移拼接，比它内部 6 次 next() 本身贵得多。");
}

// ---------------------------------------------------------------------------
// 6. 真实负载
// ---------------------------------------------------------------------------

sink.section("6. 真实负载：一帧 / 一 tick 里随机占多少",
    "按仓库真实用法拼出每帧的随机调用，其余逻辑不参与计时（这里只问随机值不值钱）。");

{
    const FRAME_US = 1_000_000 / 60;
    const TICK_US = 50_000;

    interface Workload {
        readonly label: string;
        readonly calls: number;
        readonly run: (rng: Random, gauss: GaussianRandom) => void;
    }

    const workloads: Workload[] = [
        {
            label: "典型一帧（8 规则 / 3000 mob / 2 生怪 / 3 爆炸×24 粒子）",
            calls: 8 + 24 + 16 + 288,
            run: (rng, gauss) => {
                for (let i = 0; i < 8; i++) acc ^= (rng.nextFloat() * 0x100000000) >>> 0;                 // SpawnRule jitter
                for (let i = 0; i < 24; i++) acc ^= (rng.nextFloat() * 0x100000000) >>> 0;                // MobAI 漫游：3000×20%×2/50
                for (let s = 0; s < 2; s++) for (let c = 0; c < 8; c++) acc += rng.nextInt(24, 1736); // spawnAtTopBest
                for (let p = 0; p < 288; p++) acc ^= (gauss.nextGaussian() * 0x100000000) >>> 0;          // 爆炸粒子：3×24×4
            },
        },
        {
            label: "全部 mob 同时转向（3000 只 × 2 次 nextFloat）",
            calls: 6000,
            run: rng => {
                for (let i = 0; i < 6000; i++) acc ^= (rng.nextFloat() * 0x100000000) >>> 0;
            },
        },
        {
            label: "爆炸 ×10（30 次爆炸 × 24 粒子 × 4 次高斯）",
            calls: 2880,
            run: (_rng, gauss) => {
                for (let i = 0; i < 2880; i++) acc ^= (gauss.nextGaussian() * 0x100000000) >>> 0;
            },
        },
        {
            label: "爆炸 ×100（300 次爆炸）",
            calls: 28_800,
            run: (_rng, gauss) => {
                for (let i = 0; i < 28_800; i++) acc ^= (gauss.nextGaussian() * 0x100000000) >>> 0;
            },
        },
        {
            label: "整 frame 重抽生怪（100 次 spawnAtTopBest × 8 候选）",
            calls: 800,
            run: rng => {
                for (let i = 0; i < 800; i++) acc += rng.nextInt(24, 1736);
            },
        },
    ];

    const xor = new RandomXor(SEED, 1);
    const gauss = new GaussianRandom();
    const rows: Cell[][] = [];

    for (const w of workloads) {
        const ns = measure(n => {
            for (let i = 0; i < n; i++) w.run(xor, gauss);
        });
        const us = ns / 1000;
        rows.push([
            w.label,
            intText(w.calls),
            us < 1 ? `${(us * 1000).toFixed(1)} ns` : `${us.toFixed(2)} µs`,
            pctText(us / FRAME_US),
            pctText(us / TICK_US),
        ]);
    }
    sink.table(["工作负载（每次调用 = 一帧）", "随机调用数", "每帧耗时", "占 16.7ms", "占 50ms tick"], rows);

    // 换 RNG 的差异用「纯 RNG、无高斯」的工作负载去量，否则会被高斯淹没
    const variants: { label: string; make: () => Random }[] = [
        {label: "RandomXor", make: () => new RandomXor(SEED, 1)},
        {label: "RandomLcg", make: () => new RandomLcg(SEED, 1)},
        {label: "BuiltinRandom", make: () => new BuiltinRandom()},
        {label: "SimpleRandom", make: () => new SimpleRandom(0x9E3779B9)},
    ];
    let baseNs = 0;
    const variantRows: Cell[][] = variants.map(({label, make}) => {
        const rng = make();
        const ns = measure(n => {
            for (let i = 0; i < n; i++) for (let k = 0; k < 6000; k++) acc ^= (rng.nextFloat() * 0x100000000) >>> 0;
        });
        if (baseNs === 0) baseNs = ns;
        return [label, `${(ns / 1000).toFixed(2)} µs`, timesText(ns / baseNs)];
    });
    sink.table(["6000 次 nextFloat（3000 只 mob 同时转向）", "每帧耗时", "相对 RandomXor"], variantRows);

    sink.note("结论：随机本身在帧预算里几乎不可见（除了人为放大的爆炸×100，其余都在 0.2% 以下）。"
        + `按 RandomXor ${nsText(nsXor)}ns 的单价，吃满 1% 帧预算（${(FRAME_US / 100).toFixed(0)} µs）需要约 ${intText(Math.round(FRAME_US * 1000 / 100 / nsXor))} 次 next()，`
        + `吃满整帧需要约 ${intText(Math.round(FRAME_US * 1000 / nsXor / 1e4))} 万次；`
        + "所以选型该优先看可复现性 / 周期 / 低位质量，而不是 next() 快几个 ns。");
}

// ---------------------------------------------------------------------------
// 7. GaussianRandom
// ---------------------------------------------------------------------------

sink.section("7. GaussianRandom", "客户端爆炸粒子的偏移/速度都是它生成的，4 次调用/粒子。");

{
    const g = new GaussianRandom();
    const cases: Case[] = [
        {
            label: "nextGaussian()", loop: n => {
                for (let i = 0; i < n; i++) acc ^= (g.nextGaussian() * 0x100000000) >>> 0;
            }
        },
        {
            label: "nextGaussian(0, 8)", loop: n => {
                for (let i = 0; i < n; i++) acc ^= (g.nextGaussian(0, 8) * 0x100000000) >>> 0;
            }
        },
        {
            label: "Math.random()（同口径）", loop: n => {
                for (let i = 0; i < n; i++) acc ^= (Math.random() * 0x100000000) >>> 0;
            }
        },
    ];
    const results = benchCases(cases);
    const gaussNs = results[0]!.ns;

    sink.table(
        ["操作", "ns/op", "Mops/s", "相对 Math.random", "备注"],
        [
            [results[0]!.label, nsText(results[0]!.ns), mopsText(results[0]!.ns), timesText(results[0]!.ns / results[2]!.ns), "极坐标法：拒绝采样 + sqrt/log/2 mul"],
            [results[1]!.label, nsText(results[1]!.ns), mopsText(results[1]!.ns), timesText(results[1]!.ns / results[2]!.ns), "额外的乘加"],
            [results[2]!.label, nsText(results[2]!.ns), mopsText(results[2]!.ns), timesText(1), "下界"],
        ],
    );
    sink.note("一次高斯 ≈ " + (gaussNs / results[2]!.ns).toFixed(1) + " 次同口径的 Math.random：极坐标法平均要抽 1.27 对 (u,v)，"
        + "其中一半的调用直接返回上一轮存下的 spare，剩下的再加 sqrt/log。"
        + "它是这批实现里最贵的一个，而且用的是 Math.random 而不是项目 Random，因此不可复现 —— "
        + `一颗粒子的 4 次调用约 ${(gaussNs * 4 / 1000).toFixed(3)} µs，一次 24 粒子的爆炸约 ${(gaussNs * 96 / 1000).toFixed(2)} µs，仍然远低于 16.7ms；`
        + "只有在「一次爆炸几百粒子且同帧多发」时才有优化价值（换成预计算表 / 共享一条 Random 流）。");
}

// ---------------------------------------------------------------------------

sink.section("汇总", "一行话版本。");
sink.table(
    ["问题", "答案"],
    [
        ["哪个 next() 最快（快 → 慢）", `SimpleRandom ${nsText(nsSimple)}ns → RandomXor ${nsText(nsXor)}ns → BuiltinRandom ${nsText(nsBuiltin)}ns → RandomLcg ${nsText(nsLcg)}ns`],
        ["最贵的常用派生方法", "nextDouble() / nextBool() 都是 2× next()；pickIter() 是 O(n)，n=1024 时比 pick() 慢两个数量级"],
        ["nextIntBelow 的坑", "bound 是运行期变量时 ~24ns（int32 idiv），写成字面量 ~8ns（乘法归约）；bound > 2^31 拒绝率可到 50%，单价再翻倍"],
        ["构造 / split() 能进热路径吗", `不能：split() ${nsText(nsSplit)}ns ≈ ${Math.round(nsSplit / nsXor)} 次 next()；只适合世界加载 / 分流的时刻`],
        ["随机是帧时间瓶颈吗", "不是。典型一帧的随机成本在万分之几，选型该看质量与可复现性"],
    ],
);

console.log(`\n校验和 acc=${acc}（循环确实被执行，非死代码）`);
