/**
 * Seed / Random 测试共用夹具。
 *
 * 只放"与断言框架无关"的纯统计工具（不做断言）：断言留在各测试文件里，
 * 这样失败信息才带得上上下文（哪个种子、哪个 stream、阈值多少）。
 *
 * 阈值口径统一说明：
 *   两个统计无关的 32-bit 流，任意一位不同的概率是 1/2，
 *   所以 words × 32 bit 上的汉明距离近似 N(words × 16, σ = √(words × 8))。
 *   各测试的阈值都取在正常抖动之外：汉明距离类给的是比 ±4σ 更松的区间，
 *   卡方类取 0.001 临界值往上的一档，因此失败基本只可能来自真实退化。
 *
 * 因为所有 RNG 都由固定种子驱动，这些统计断言本身是确定性的（不是概率性 flaky）：
 * 唯一的例外见 Seed.test.ts 中 Seed.generate() 的两条断言，它们读 crypto 熵源。
 */

/** a ^ b 中置 1 的 bit 数（先归一成 32 bit 无符号） */
export function popcountDiff(a: number, b: number): number {
    let x = (a ^ b) >>> 0;
    let count = 0;
    while (x !== 0) {
        count += x & 1;
        x >>>= 1;
    }
    return count;
}

/**
 * 卡方统计量：Σ (O - E)² / E。
 * @param observed 各分类的实际频数
 * @param expected 每类的期望频数（各类相同即"均匀性检验"）
 */
export function chiSquare(observed: readonly number[], expected: number): number {
    let stat = 0;
    for (const o of observed) {
        const d = o - expected;
        stat += (d * d) / expected;
    }
    return stat;
}

/**
 * 连续取 n 个样本的均值。
 * 注意：传入的 sample 必须绑定到**同一个** RNG 实例，否则测的不是同一个流。
 */
export function meanOf(n: number, sample: () => number): number {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += sample();
    return sum / n;
}

/**
 * 汉明距离统计：两段等长的 uint32 序列之间有多少 bit 不同、有多少个字完全相同。
 */
export interface DiffStats {
    /** 不同 bit 的总数（满值 = words × 32） */
    readonly diff: number;
    /** 完全相同的输出字个数（理想的统计无关流应当为 0） */
    readonly eq: number;
    /** 总 bit 数，用于打印 "diff/span" */
    readonly span: number;
}

/** 比较两段等长 uint32 序列（按较短的一段逐字比较） */
export function diffWords(a: Uint32Array | readonly number[], b: Uint32Array | readonly number[]): DiffStats {
    const words = Math.min(a.length, b.length);
    let diff = 0;
    let eq = 0;
    for (let i = 0; i < words; i++) {
        diff += popcountDiff(a[i], b[i]);
        if (a[i] === b[i]) eq++;
    }
    return {diff, eq, span: words * 32};
}

/** 把 DiffStats 格式化成可读的失败信息 */
export function describeDiff(label: string, s: DiffStats): string {
    return `${label}：汉明距离 ${s.diff}/${s.span} bit（统计无关时约 ${s.span / 2}），完全相同的输出字 ${s.eq}`;
}
