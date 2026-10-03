/**
 * Random / RandomXor / RandomLcg 单元测试（node:test）
 *
 * 运行：
 *   node --test test/Random.test.ts
 *   （Node ≥ 23.6 默认擦除 .ts 类型；Node 22.6–23.5 需加 --experimental-strip-types）
 *   CI 里直接跑 `npm test`（见 package.json）。
 *
 * 结构：通用语义（nextFloat / nextDouble / nextInt / nextIntBelow / nextBool / pick /
 * shuffleInplace / split / 生日碰撞 / 一阶转移 / 确定性）对 Xor 与 Lcg 两个实现各跑一遍；
 * 最后是 LCG 的低位退化回归 —— 把"修复前的原始 LCG"作为对照锚点写进断言，
 * 而不是只打印出来，这样退化一旦回归就会失败。
 *
 * 说明：所有阈值都建立在固定种子(20241001)的确定性输出上，因此断言本身是确定性的。
 */

import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {Seed} from "../src/utils/math/random/Seed.ts";
import type {Random} from "../src/utils/math/random/Random.ts";
import {RandomXor} from "../src/utils/math/random/RandomXor.ts";
import {RandomLcg} from "../src/utils/math/random/RandomLcg.ts";
import {chiSquare, describeDiff, diffWords, meanOf, popcountDiff} from "./support/randomFixtures.ts";

type Factory = (seed: Seed, stream?: number) => Random;

interface Impl {
    readonly label: string;
    readonly make: Factory;
}

const IMPLS: readonly Impl[] = [
    {label: "RngXor", make: (seed, stream = 0) => new RandomXor(seed, stream)},
    {label: "RngLcg", make: (seed, stream = 0) => new RandomLcg(seed, stream)},
];

const SEED = new Seed(20241001);

/** 跨实现共用的"典型调用序列"指纹 */
function sequence(r: Random): string {
    return [
        r.nextFloat(),
        r.nextDouble(),
        r.nextInt(1, 100),
        r.nextBool(0.3),
        r.pick(["x", "y", "z"]),
        r.nextIntBelow(1000),
    ].join("|");
}

/** 连续抽 count 次 nextIntBelow(bound)，返回各取值的频数 */
function tally(r: Random, bound: number, count: number): number[] {
    const observed = new Array<number>(bound).fill(0);
    for (let i = 0; i < count; i++) observed[r.nextIntBelow(bound)]++;
    return observed;
}

// ---------------------------------------------------------------------------
// 1. 通用语义：两个实现各跑一遍
// ---------------------------------------------------------------------------

for (const {label, make} of IMPLS) {
    describe(`${label} · 通用 Random 语义`, () => {
        const rng = (stream = 0): Random => make(SEED, stream);

        // ---- nextFloat / nextDouble ----

        it("nextFloat 全部落在 [0, 1)", () => {
            const r = rng();
            for (let i = 0; i < 100_000; i++) {
                const value = r.nextFloat();
                assert.ok(value >= 0 && value < 1, `${label}: 第 ${i} 个样本越界 ${value}`);
            }
        });

        it("nextFloat 均值 ≈ 0.5", (t) => {
            const r = rng();
            // 均值必须取自同一实例的连续输出，否则测的不是同一个流
            const mean = meanOf(100_000, () => r.nextFloat());
            t.diagnostic(`mean=${mean.toFixed(6)}`);
            assert.ok(Math.abs(mean - 0.5) < 0.005, `${label}: 均值 ${mean.toFixed(6)} 偏离 0.5`);
        });

        it("nextDouble 的值域 / 53 bit 精度 / 均值 / 覆盖", (t) => {
            const r = rng();
            const samples = 200_000;
            let sum = 0;
            let high = 0;
            for (let i = 0; i < samples; i++) {
                const value = r.nextDouble();
                assert.ok(value >= 0 && value < 1, `${label}: 第 ${i} 个样本越界 ${value}`);
                assert.ok(
                    Number.isInteger(value * 0x20000000000000),
                    `${label}: 第 ${i} 个样本不在 53 bit 网格上 ${value}`,
                );
                sum += value;
                if (value >= 0.5) high++;
            }
            const mean = sum / samples;
            t.diagnostic(`mean=${mean.toFixed(6)} high=${high}/${samples}`);
            assert.ok(Math.abs(mean - 0.5) < 0.005, `${label}: 均值 ${mean.toFixed(6)} 偏离 0.5`);
            assert.ok(
                Math.abs(high / samples - 0.5) < 0.01,
                `${label}: [0.5, 1) 占比 ${(high / samples).toFixed(4)} 偏离 0.5`,
            );
        });

        // ---- nextInt ----

        it("nextInt 取遍闭区间两端", () => {
            const r = rng();
            let sawMin = false;
            let sawMax = false;
            for (let i = 0; i < 20_000; i++) {
                const value = r.nextInt(3, 7);
                assert.ok(value >= 3 && value <= 7, `${label}: nextInt(3, 7) 越界 ${value}`);
                sawMin ||= value === 3;
                sawMax ||= value === 7;
            }
            assert.ok(sawMin && sawMax, `${label}: 20000 次采样未取到全部端点`);
        });

        it("nextInt 在 min == max 时返回 min", () => {
            assert.equal(rng().nextInt(5, 5), 5);
        });

        it("nextInt 拒绝非法参数", () => {
            assert.throws(() => rng().nextInt(5, 4), /min <= max/);
            assert.throws(() => rng().nextInt(1.5, 4), /must be integers/);
            assert.throws(() => rng().nextInt(0, 0x100000000), /span must be/);
        });

        it("nextInt 支持整个 32 bit 值域", () => {
            const value = rng().nextInt(0, 0xFFFFFFFF);
            assert.ok(
                Number.isInteger(value) && value >= 0 && value <= 0xFFFFFFFF,
                `${label}: nextInt(0, 0xFFFFFFFF) 越界 ${value}`,
            );
        });

        // ---- nextIntBelow：均匀性与拒绝采样 ----

        describe("nextIntBelow", () => {
            const samples = 300_000;

            it("nextIntBelow(3) 无偏", (t) => {
                const observed = tally(rng(), 3, samples);
                const stat = chiSquare(observed, samples / 3);
                t.diagnostic(`chi2=${stat.toFixed(2)} (df=2, 0.001 临界 13.8)`);
                assert.ok(stat < 25, `${label}: chi2=${stat.toFixed(2)} 超出阈值 25`);
            });

            it("nextIntBelow(6) 无偏", (t) => {
                const observed = tally(rng(), 6, samples);
                const stat = chiSquare(observed, samples / 6);
                t.diagnostic(`chi2=${stat.toFixed(2)} (df=5, 0.001 临界 20.5)`);
                assert.ok(stat < 35, `${label}: chi2=${stat.toFixed(2)} 超出阈值 35`);
            });

            it("nextIntBelow(2^31+1) 无偏（拒绝采样覆盖超过 2^30 的 bound）", (t) => {
                const r = rng();
                let low = 0;
                for (let i = 0; i < samples; i++) {
                    if (r.nextIntBelow(0x80000001) < 0x40000000) low++;
                }
                const stat = chiSquare([low, samples - low], samples / 2);
                t.diagnostic(`chi2=${stat.toFixed(2)}`);
                assert.ok(stat < 15, `${label}: chi2=${stat.toFixed(2)} 超出阈值 15`);
            });

            it("nextIntBelow(2) 约 50/50", (t) => {
                const observed = tally(rng(), 2, 100_000);
                t.diagnostic(`zero=${observed[0]}/100000`);
                assert.ok(
                    Math.abs(observed[0] - 50_000) < 1500,
                    `${label}: 0 的占比偏离 50%（${observed[0]}/100000）`,
                );
            });

            it("nextIntBelow(1) 恒为 0", () => {
                const r = rng();
                for (let i = 0; i < 1000; i++) {
                    assert.equal(r.nextIntBelow(1), 0);
                }
            });

            it("nextIntBelow 拒绝非法 bound", () => {
                assert.throws(() => rng().nextIntBelow(0), /bound must be an integer/);
                assert.throws(() => rng().nextIntBelow(0x100000001), /bound must be an integer/);
            });
        });

        // ---- nextBool ----

        it("nextBool(0.2) 命中率 ≈ 20%", (t) => {
            const r = rng();
            const samples = 100_000;
            let hits = 0;
            for (let i = 0; i < samples; i++) if (r.nextBool(0.2)) hits++;
            const rate = hits / samples;
            t.diagnostic(`rate=${rate.toFixed(4)}`);
            assert.ok(Math.abs(rate - 0.2) < 0.01, `${label}: 命中率 ${rate.toFixed(4)} 偏离 0.2`);
        });

        it("nextBool 在边界恒真/恒假，NaN 报错", () => {
            const r = rng();
            assert.equal(r.nextBool(0), false);
            assert.equal(r.nextBool(1), true);
            assert.throws(() => r.nextBool(NaN), /probability/);
        });

        // ---- pick ----

        describe("pick", () => {
            it("空数组报错", () => {
                assert.throws(() => rng().pick([]), /non-empty/);
            });

            it("各元素被均匀抽到", (t) => {
                const arr = ["a", "b", "c", "d"];
                const r = rng();
                const samples = 200_000;
                const observed = new Array<number>(arr.length).fill(0);
                for (let i = 0; i < samples; i++) observed[arr.indexOf(r.pick(arr))]++;
                const stat = chiSquare(observed, samples / arr.length);
                t.diagnostic(`chi2=${stat.toFixed(2)}`);
                assert.ok(stat < 25, `${label}: chi2=${stat.toFixed(2)} 超出阈值 25`);
            });
        });

        // ---- shuffleInplace ----

        describe("shuffleInplace", () => {
            it("保持多重集，且 200 次都不与原序相同", () => {
                const source = Array.from({length: 52}, (_, i) => i);
                const r = rng();
                for (let t = 0; t < 200; t++) {
                    const shuffled = r.shuffleInplace(source.slice());
                    assert.notDeepEqual(shuffled, source, `${label}: 第 ${t} 次洗牌结果与输入同序`);
                    assert.deepEqual(
                        shuffled.slice().sort((a, b) => a - b),
                        source,
                        `${label}: 第 ${t} 次洗牌破坏了多重集`,
                    );
                }
            });

            it("每个元素落在每个位置的概率均匀", (t) => {
                const n = 5;
                const shuffles = 100_000;
                const cells: number[][] = Array.from({length: n}, () => new Array<number>(n).fill(0));
                const r = rng();
                for (let t = 0; t < shuffles; t++) {
                    const arr = r.shuffleInplace(Array.from({length: n}, (_, i) => i));
                    for (let pos = 0; pos < n; pos++) cells[arr[pos]][pos]++;
                }
                const stat = chiSquare(cells.flat(), shuffles / n);
                t.diagnostic(`chi2=${stat.toFixed(2)} (df=24, 0.001 临界 51.2)`);
                assert.ok(stat < 60, `${label}: chi2=${stat.toFixed(2)} 超出阈值 60`);
            });
        });

        // ---- split ----

        describe("split", () => {
            it("返回同类型的新实例", () => {
                const parent = make(new Seed(42), 0);
                assert.equal(parent.split().constructor, parent.constructor);
            });

            it("两次 split 得到的子流不同且互不相关", (t) => {
                const parent = make(new Seed(42), 0);
                const childA = parent.split();
                const childB = parent.split();
                const wordsA = Array.from({length: 8}, () => childA.next() >>> 0);
                const wordsB = Array.from({length: 8}, () => childB.next() >>> 0);
                const stats = diffWords(wordsA, wordsB);
                t.diagnostic(describeDiff("两个子流", stats));
                assert.equal(stats.eq, 0, describeDiff("两个子流", stats));
                assert.ok(stats.diff > 90 && stats.diff < 166, describeDiff("两个子流", stats));
            });

            it("子流与父流互不相关", (t) => {
                const parent = make(new Seed(42), 0);
                const child = parent.split();
                // split() 会推进父流状态，这里再取父流的后续输出做对比
                const parentWords = Array.from({length: 8}, () => parent.next() >>> 0);
                const childWords = Array.from({length: 8}, () => child.next() >>> 0);
                const stats = diffWords(parentWords, childWords);
                t.diagnostic(describeDiff("父流 vs 子流", stats));
                assert.equal(stats.eq, 0, describeDiff("父流 vs 子流", stats));
                assert.ok(stats.diff > 90 && stats.diff < 166, describeDiff("父流 vs 子流", stats));
            });

            it("同一种子下 split 的结果可复现", () => {
                const firstChildWords = (): number[] => {
                    const child = make(new Seed(42), 0).split();
                    return Array.from({length: 8}, () => child.next() >>> 0);
                };
                assert.deepEqual(firstChildWords(), firstChildWords());
            });

            it("支持递归 split", () => {
                const parent = make(new Seed(42), 0);
                const grandChild = parent.split().split();
                assert.equal(grandChild.constructor, parent.constructor);
            });
        });

        // ---- 输出质量 ----

        it("32 bit 输出的重复率符合生日碰撞预期", (t) => {
            const r = rng();
            const samples = 500_000;
            const seen = new Set<number>();
            for (let i = 0; i < samples; i++) seen.add(r.next() >>> 0);
            const collisions = samples - seen.size;
            const expected = (samples * samples) / (2 * 2 ** 32);
            t.diagnostic(`collisions=${collisions} expected≈${expected.toFixed(1)}`);
            assert.ok(
                collisions <= expected * 3 + 20,
                `${label}: 碰撞 ${collisions} 次，远超生日预期 ${expected.toFixed(1)}`,
            );
        });

        it("mod 4 的一阶转移均匀（专治低位固定循环）", (t) => {
            const cells = 4;
            const samples = 400_000;
            const r = rng();
            const pairs: number[][] = Array.from({length: cells}, () => new Array<number>(cells).fill(0));
            let prev = r.nextIntBelow(cells);
            for (let i = 0; i < samples; i++) {
                const cur = r.nextIntBelow(cells);
                pairs[prev][cur]++;
                prev = cur;
            }
            const stat = chiSquare(pairs.flat(), samples / (cells * cells));
            t.diagnostic(`chi2=${stat.toFixed(2)} (df=15, 0.001 临界 37.7)`);
            assert.ok(stat < 60, `${label}: chi2=${stat.toFixed(2)} 超出阈值 60`);
        });

        // ---- 确定性 ----

        describe("确定性", () => {
            it("同种子同 stream 的输出序列完全一致", () => {
                assert.equal(sequence(make(new Seed(999), 3)), sequence(make(new Seed(999), 3)));
            });

            it("不同 stream 的输出序列不同", () => {
                assert.notEqual(sequence(make(new Seed(999), 3)), sequence(make(new Seed(999), 4)));
            });

            it("不同种子的输出序列不同", () => {
                assert.notEqual(sequence(make(new Seed(999), 3)), sequence(make(new Seed(1000), 3)));
            });
        });
    });
}

// ---------------------------------------------------------------------------
// 2. LCG 低位退化回归
//    把"修复前"的行为写成断言作为对照锚点：它必须保持退化，
//    而修复后的实现必须完全通过基类语义（含 mod 4 的 16 种转移）。
// ---------------------------------------------------------------------------

describe("RandomLcg · 低位退化回归", () => {
    /** 修复前的原始 LCG：直接返回 state，没有输出混合 */
    function rawLcgSeq(start: number, n: number): number[] {
        let state = start;
        const out: number[] = [];
        for (let i = 0; i < n; i++) {
            state = (Math.imul(1664525, state) + 1013904223) >>> 0;
            out.push(state);
        }
        return out;
    }

    /** 统计一阶转移的种类（元素需已归一到小数域，如 v % 4） */
    function transitions(seq: readonly number[]): Set<string> {
        const pairs = new Set<string>();
        for (let i = 1; i < seq.length; i++) pairs.add(`${seq[i - 1]}->${seq[i]}`);
        return pairs;
    }

    it("对照：修复前的 state % 4 是 [0,3,2,1] 的严格周期", () => {
        assert.deepEqual(rawLcgSeq(12345, 12).map(v => v % 4), [0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1]);
    });

    it("对照：修复前的 mod 4 只有 4/16 种转移", () => {
        const pairs = transitions(rawLcgSeq(12345, 1000).map(v => v % 4));
        assert.equal(pairs.size, 4, `转移集合：${[...pairs].join(" ")}`);
    });

    it("对照：修复前的 mod 4 一阶转移 chi2 爆表（约 1.2e6，临界 37.7）", () => {
        const seq = rawLcgSeq(12345, 400_000).map(v => v % 4);
        const cells = Array.from({length: 4}, () => new Array<number>(4).fill(0));
        for (let i = 1; i < seq.length; i++) cells[seq[i - 1]][seq[i]]++;
        const stat = chiSquare(cells.flat(), seq.length / 16);
        assert.ok(stat > 1_000_000, `chi2=${stat.toFixed(0)} 应远大于临界值`);
    });

    it("修复后：mod 4 覆盖全部 16 种转移", (t) => {
        const r = new RandomLcg(SEED, 0);
        const seq: number[] = [];
        for (let i = 0; i < 1000; i++) seq.push(r.nextIntBelow(4));
        t.diagnostic(`前 12 次 nextIntBelow(4) = [${seq.slice(0, 12).join(", ")}]`);
        assert.equal(transitions(seq).size, 16);
    });

    it("修复后：连续输出的比特翻转率 ≈ 50%", (t) => {
        const r = new RandomLcg(SEED, 0);
        const samples = 200_000;
        let flips = 0;
        let prev = r.next() >>> 0;
        for (let i = 0; i < samples; i++) {
            const cur = r.next() >>> 0;
            flips += popcountDiff(prev, cur);
            prev = cur;
        }
        const rate = flips / (samples * 32);
        t.diagnostic(`rate=${(rate * 100).toFixed(2)}%`);
        assert.ok(Math.abs(rate - 0.5) < 0.01, `比特翻转率 ${(rate * 100).toFixed(2)}% 偏离 50%`);
    });
});
