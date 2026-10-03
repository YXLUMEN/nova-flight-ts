export class Seed {
    // 2^32, 用于把 number 拆成高低 32 bit
    private static readonly TWO32 = 0x100000000;
    private static readonly MASK16 = 0xFFFF;
    // splitmix32 增量
    private static readonly GOLDEN32 = 0x9E3779B9;

    private readonly w0: number;
    private readonly w1: number;
    private readonly w2: number;
    // 熵的 16 个 5-bit 视图(0–31), 仅用于外部检视
    private readonly values: readonly number[];

    public constructor(seed: number | bigint) {
        if (typeof seed === 'number') {
            if (!Number.isSafeInteger(seed)) {
                throw new Error(
                    `Numeric seed must be a safe integer (use bigint beyond 2^53): ${seed}`
                );
            }
            if (seed < 0) {
                throw new Error(`Numeric seed must be non-negative: ${seed}`);
            }
            this.w0 = seed >>> 0;
            this.w1 = Math.floor(seed / Seed.TWO32) >>> 0;
            this.w2 = Math.floor(seed / (Seed.TWO32 * Seed.TWO32)) & Seed.MASK16;
        } else if (typeof seed === 'bigint') {
            if (seed < 0n) {
                throw new Error(`Numeric seed must be non-negative: ${seed}`);
            }
            // 只保留低 80 bit（BigInt 仅在此分支出现）
            const masked = seed & ((1n << 80n) - 1n);
            this.w0 = Number(masked & 0xFFFFFFFFn);
            this.w1 = Number((masked >> 32n) & 0xFFFFFFFFn);
            this.w2 = Number((masked >> 64n) & 0xFFFFn);
        } else {
            throw new Error(`Seed expects a number or bigint, got ${typeof seed}`);
        }

        this.values = Object.freeze(Seed.split5(this.w0, this.w1, this.w2));
        Object.freeze(this);
    }

    /** 返回 16 个 0–31 的数值（熵的 5-bit 视图） */
    public getValues(): readonly number[] {
        return this.values;
    }

    /** 原始 80 bit 熵 */
    public toBigInt(): bigint {
        return BigInt(this.w0) | (BigInt(this.w1) << 32n) | (BigInt(this.w2) << 64n);
    }

    /** 十进制表示 */
    public toString(): string {
        return this.toBigInt().toString(10);
    }

    public equals(other: Seed): boolean {
        return this.w0 === other.w0 && this.w1 === other.w1 && this.w2 === other.w2;
    }

    /**
     * 将 80-bit 熵展开为 n 个 uint32.
     * - 每个输出字都独立混合整份 80 bit 熵（因此熵不会被压缩到 32 bit）
     * - stream 用于从同一份熵分流；不同 (种子, stream) 组合统计无关
     * - 相邻数字种子（1, 2, 3）同样互不相关
     */
    public expand(count: number, stream: number = 0): Uint32Array {
        if (!Number.isInteger(count) || count < 0) {
            throw new Error(`count must be a non-negative integer, got ${count}`);
        }

        const {w0, w1, w2} = this;
        const out = new Uint32Array(count);

        let h = Seed.mix32((Seed.GOLDEN32 ^ (stream >>> 0)) >>> 0);
        for (let i = 0; i < count; i++) {
            h = Seed.mix32((h + i) >>> 0);
            let z = Seed.mix32((h ^ w0) >>> 0);
            z = Seed.mix32((z ^ w1) >>> 0);
            z = Seed.mix32((z ^ w2) >>> 0);
            out[i] = z;
        }
        return out;
    }

    /** murmur3 fmix32: 32-bit 雪崩混合 */
    private static mix32(x: number): number {
        x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0;
        x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35) >>> 0;
        return (x ^ (x >>> 16)) >>> 0;
    }

    /** 把 3 × uint32 切成 16 个 5-bit 值(跨字边界处理) */
    private static split5(w0: number, w1: number, w2: number): number[] {
        const words = [w0, w1, w2];
        const out: number[] = [];
        for (let i = 0; i < 16; i++) {
            const bitPos = i * 5;
            const wi = bitPos >>> 5;
            const off = bitPos & 31;
            let v = words[wi] >>> off;
            if (off > 27) {
                v |= words[wi + 1] << (32 - off);
            }
            out.push(v & 31);
        }
        return out;
    }

    /** 随机数字种子(80 bit CSPRNG 熵; 此处会有一次 BigInt 拼接) */
    public static generate(): Seed {
        const rv = new Uint32Array(3);
        crypto.getRandomValues(rv);
        const w2 = rv[2] & Seed.MASK16;
        return new Seed(
            BigInt(rv[0]) | (BigInt(rv[1]) << 32n) | (BigInt(w2) << 64n)
        );
    }
}
