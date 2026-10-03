/**
 * Seed 单元测试（node:test）
 *
 * 运行：
 *   node --test test/Seed.test.ts
 *   （Node ≥ 23.6 默认擦除 .ts 类型；Node 22.6–23.5 需加 --experimental-strip-types）
 *   CI 里直接跑 `npm test`（见 package.json）。
 *
 * 覆盖：
 *   构造与参数校验 / 80 bit 熵的编码与检视（toBigInt/toString/getValues）/
 *   expand 的确定性与非退化 / 不同种子与不同 stream 的统计独立性 /
 *   相邻种子与单 bit 扰动雪崩 / 20 万连续种子的状态无碰撞 /
 *   generate() 的熵范围 / expand 参数校验。
 *
 * 说明：除 generate() 的两条断言外，本文件的阈值都是对"固定种子的确定性输出"下的判断，
 * 换实现就会失败 —— 这正是回归测试想要的效果，而不是概率性 flaky。
 */

import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {Seed} from "../src/utils/math/random/Seed.ts";
import {describeDiff, type DiffStats, diffWords} from "./support/randomFixtures.ts";

// ---------------------------------------------------------------------------
// 局部夹具
// ---------------------------------------------------------------------------

/** 两个统计无关的流在 16 个字（512 bit）上的经验区间：≈256 ± 8.5σ */
const UNRELATED_16_MIN = 160;
const UNRELATED_16_MAX = 352;

/** 两个统计无关的流在 4 个字（128 bit）上的经验区间 */
const UNRELATED_4_MIN = 20;

/** 取 (seed, stream) 的 n 个展开字，与另一组比较 */
function compare(a: Seed, streamA: number, b: Seed, streamB: number, words = 16): DiffStats {
    return diffWords(a.expand(words, streamA), b.expand(words, streamB));
}

/** 断言两组输出"统计无关"：没有完全相同的字，且汉明距离落在经验区间内 */
function assertUnrelated(label: string, stats: DiffStats, min: number, max: number): void {
    assert.equal(stats.eq, 0, describeDiff(label, stats));
    assert.ok(stats.diff > min && stats.diff < max, describeDiff(label, stats));
}

// ---------------------------------------------------------------------------
// 1. 构造与类型
// ---------------------------------------------------------------------------

describe("Seed · 构造与参数校验", () => {
    it("number 种子按原值保留", () => {
        assert.equal(new Seed(1).toBigInt(), 1n);
        assert.equal(new Seed(0).toBigInt(), 0n);
        assert.equal(new Seed(123456789).toBigInt(), 123456789n);
    });

    it("bigint 种子按原值保留（超过 2^53 也精确）", () => {
        const seed = 2n ** 60n + 7n;
        assert.equal(new Seed(seed).toBigInt(), seed);
    });

    it("超过 80 bit 的种子只保留低 80 bit", () => {
        assert.equal(new Seed((1n << 80n) | 5n).toBigInt(), 5n);
        assert.equal(new Seed((1n << 96n) | (1n << 79n)).toBigInt(), 1n << 79n);
    });

    it("非安全整数种子报错", () => {
        assert.throws(() => new Seed(2 ** 53), /safe integer/);
    });

    it("负数种子报错（number 与 bigint 都要拦）", () => {
        assert.throws(() => new Seed(-1), /non-negative/);
        assert.throws(() => new Seed(-1n), /non-negative/);
    });

    it("非 number / bigint 的类型报错", () => {
        assert.throws(() => new Seed("ABC" as unknown as number), /number or bigint/);
        assert.throws(() => new Seed(undefined as unknown as number), /number or bigint/);
        assert.throws(() => new Seed(null as unknown as bigint), /number or bigint/);
    });

    it("equals 按 80 bit 熵比较", () => {
        assert.equal(new Seed(7).equals(new Seed(7)), true);
        assert.equal(new Seed(7).equals(new Seed(8)), false);
        // 截断成同一个 80 bit 值 => 相等
        assert.equal(new Seed((1n << 80n) | 9n).equals(new Seed(9)), true);
    });

    it("实例被冻结（种子不可被外部改写）", () => {
        assert.equal(Object.isFrozen(new Seed(1)), true);
    });
});

// ---------------------------------------------------------------------------
// 2. 编码与检视
// ---------------------------------------------------------------------------

describe("Seed · 编码与检视", () => {
    it("toString 输出十进制全精度", () => {
        assert.equal(new Seed(12345).toString(), "12345");
        assert.equal(new Seed(2n ** 70n + 3n).toString(), (2n ** 70n + 3n).toString());
    });

    it("getValues 返回 16 个 0–31 的 5-bit 值并冻结", () => {
        const values = new Seed(9).getValues();
        assert.equal(values.length, 16);
        assert.ok(values.every(v => v >= 0 && v <= 31), `值域越界: ${values.join(",")}`);
        assert.equal(Object.isFrozen(values), true);
    });

    it("getValues 与 80 bit 熵的 5-bit 切分一致（跨字边界）", () => {
        const seed = new Seed(0x12345);
        const values = seed.getValues();
        const entropy = seed.toBigInt();
        for (let i = 0; i < 16; i++) {
            const expected = Number((entropy >> BigInt(i * 5)) & 0x1Fn);
            assert.equal(values[i], expected, `第 ${i} 个 5-bit 值不匹配`);
        }
    });

    it("number 种子的高位字参与混合（32 bit 以上不丢信息）", () => {
        // 2^32 + 1 与 1 只在高 32 bit 上不同，展开结果必须不同
        const a = new Seed(1).expand(4, 0);
        const b = new Seed(2 ** 32 + 1).expand(4, 0);
        assert.notEqual(a[0], b[0]);
        assert.notEqual(a[1], b[1]);
    });
});

// ---------------------------------------------------------------------------
// 3. 确定性与非退化
// ---------------------------------------------------------------------------

describe("Seed · expand 的确定性与非退化", () => {
    it("同一 (种子, stream) 的展开完全确定", () => {
        const a = Array.from(new Seed(20241001).expand(8, 0));
        const b = Array.from(new Seed(20241001).expand(8, 0));
        assert.deepEqual(a, b);
    });

    it("展开结果与调用顺序无关（无内部状态）", () => {
        const seed = new Seed(20241001);
        const first = Array.from(seed.expand(8, 0));
        seed.expand(8, 7); // 中间穿插别的 stream，不应影响后续调用
        assert.deepEqual(Array.from(seed.expand(8, 0)), first);
    });

    it("退化种子（0 与 1）展开后没有全零字", () => {
        for (const value of [0, 1]) {
            const words = new Seed(value).expand(4, 0);
            assert.ok(Array.from(words).every(w => w !== 0), `种子 ${value} 展开出全零字`);
        }
    });
});

// ---------------------------------------------------------------------------
// 4. 不同种子互不相关
// ---------------------------------------------------------------------------

describe("Seed · 不同种子的统计独立性", () => {
    const pairs: ReadonlyArray<{ label: string; a: Seed; b: Seed }> = [
        {label: "1 vs 2", a: new Seed(1), b: new Seed(2)},
        {label: "2 vs 3", a: new Seed(2), b: new Seed(3)},
        {label: "0 vs 1", a: new Seed(0), b: new Seed(1)},
        {label: "1000000 vs 1000001", a: new Seed(1000000), b: new Seed(1000001)},
        {label: "2^40 vs 2^40+1", a: new Seed(2n ** 40n), b: new Seed(2n ** 40n + 1n)},
        {label: "1 vs 2^39", a: new Seed(1), b: new Seed(2 ** 39)},
    ];

    for (const {label, a, b} of pairs) {
        it(`种子 ${label} 的展开统计无关`, () => {
            assertUnrelated(`种子 ${label}`, compare(a, 0, b, 0), UNRELATED_16_MIN, UNRELATED_16_MAX);
        });
    }
});

// ---------------------------------------------------------------------------
// 5. 不同 stream 互不相关
// ---------------------------------------------------------------------------

describe("Seed · 不同 stream 的统计独立性", () => {
    const pairs: ReadonlyArray<readonly [number, number]> = [[0, 1], [1, 2], [0, 2], [0, 100], [7, 8]];
    const seed = new Seed(1);

    for (const [u, v] of pairs) {
        it(`stream ${u} vs ${v} 的展开统计无关`, () => {
            assertUnrelated(`stream ${u} vs ${v}`, compare(seed, u, seed, v), UNRELATED_16_MIN, UNRELATED_16_MAX);
        });
    }
});

// ---------------------------------------------------------------------------
// 6. 雪崩
// ---------------------------------------------------------------------------

describe("Seed · 雪崩效应", () => {
    it("相邻数字种子之间也不相关", () => {
        const base = new Seed(1000).expand(4, 0);
        let minDiff = Infinity;
        for (let k = 1; k <= 32; k++) {
            minDiff = Math.min(minDiff, diffWords(base, new Seed(1000 + k).expand(4, 0)).diff);
        }
        assert.ok(minDiff > UNRELATED_4_MIN, `相邻种子最小汉明距离 ${minDiff}/128，期望 > ${UNRELATED_4_MIN}`);
    });

    it("单 bit 扰动平均影响约 50% 输出位", () => {
        const base = new Seed(0x1234).expand(4, 0);
        let total = 0;
        for (let bit = 0; bit < 16; bit++) {
            total += diffWords(base, new Seed(0x1234 ^ (1 << bit)).expand(4, 0)).diff;
        }
        const average = total / 16;
        assert.ok(average > 50 && average < 78, `平均汉明距离 ${average.toFixed(1)}/128，期望落在 (50, 78)`);
    });

    it("最高字 w2（bit 64–79）参与扩散", () => {
        const base = new Seed(0).expand(4, 0);
        let minDiff = Infinity;
        for (let bit = 64; bit < 80; bit++) {
            minDiff = Math.min(minDiff, diffWords(base, new Seed(1n << BigInt(bit)).expand(4, 0)).diff);
        }
        assert.ok(minDiff > UNRELATED_4_MIN, `w2 扰动最小汉明距离 ${minDiff}/128，期望 > ${UNRELATED_4_MIN}`);
    });
});

// ---------------------------------------------------------------------------
// 7. 熵不塌缩
// ---------------------------------------------------------------------------

describe("Seed · 熵不塌缩", () => {
    it("20 万个连续种子展开后无状态碰撞", () => {
        const count = 200_000;
        const seen = new Set<string>();
        for (let i = 0; i < count; i++) {
            const words = new Seed(i).expand(4, 0);
            seen.add(`${words[0]},${words[1]},${words[2]},${words[3]}`);
        }
        assert.equal(seen.size, count, `不同种子产生了相同的展开结果（unique=${seen.size}/${count}）`);
    });
});

// ---------------------------------------------------------------------------
// 8. generate()
// ---------------------------------------------------------------------------

describe("Seed · generate()", () => {
    // 注意：这是全文件唯一依赖 crypto 熵源的部分，理论上存在极小概率的碰撞。
    it("两次 generate 都非零且互不相同", () => {
        const a = Seed.generate();
        const b = Seed.generate();
        assert.notEqual(a.toBigInt(), 0n);
        assert.equal(a.equals(b), false, `两次 generate 得到相同种子: ${a}`);
    });

    it("generate 落在 80 bit 值域内", () => {
        const value = Seed.generate().toBigInt();
        assert.ok(value >= 0n && value < (1n << 80n), `越出 80 bit: ${value}`);
    });
});

// ---------------------------------------------------------------------------
// 9. expand 参数校验
// ---------------------------------------------------------------------------

describe("Seed · expand 参数校验", () => {
    it("expand(0) 返回空数组", () => {
        assert.equal(new Seed(5).expand(0).length, 0);
    });

    it("负数 / 小数 / 非数字的 count 报错", () => {
        assert.throws(() => new Seed(5).expand(-1), /non-negative integer/);
        assert.throws(() => new Seed(5).expand(1.5), /non-negative integer/);
        assert.throws(() => new Seed(5).expand(NaN), /non-negative integer/);
    });

    it("stream 缺省为 0", () => {
        assert.deepEqual(Array.from(new Seed(5).expand(4)), Array.from(new Seed(5).expand(4, 0)));
    });
});
