import {Seed} from "./Seed.ts";

export abstract class Random {
    /** 下一个 uint32（0 – 2^32-1） */
    public abstract next(): number;

    public nextFloat(): number {
        return (this.next() >>> 0) / 0x100000000;
    }

    /** 均匀 [0,1), 53 bit 精度 */
    public nextDouble(): number {
        // hi 取 27 bit、lo 取 26 bit，合计 53 bit；权重必须是 2^26。
        const hi = this.next() >>> 0;
        const lo = this.next() >>> 0;
        return ((hi >>> 5) * 0x4000000 + (lo >>> 6)) / 0x20000000000000;
    }

    public nextBool(probability: number = 0.5): boolean {
        if (!(probability >= 0)) {
            throw new Error(`probability must be a number in [0, 1], got ${probability}`);
        }
        if (probability <= 0) return false;
        if (probability >= 1) return true;
        return this.nextDouble() < probability;
    }

    public nextIntBelow(bound: number): number {
        if (!Number.isInteger(bound) || bound <= 0 || bound > 0x100000000) {
            throw new Error(`bound must be an integer in [1, 2^32], got ${bound}`);
        }
        // 拒绝采样：丢弃落在 [limit, 2^32) 的值，使 limit 能被 bound 整除
        const limit = 0x100000000 - (0x100000000 % bound);
        let v = this.next() >>> 0;
        while (v >= limit) {
            v = this.next() >>> 0;
        }
        return v % bound;
    }

    public nextInt(min: number, max: number): number {
        if (!Number.isInteger(min) || !Number.isInteger(max)) {
            throw new Error(`nextInt bounds must be integers, got (${min}, ${max})`);
        }
        if (max < min) {
            throw new Error(`nextInt requires min <= max, got (${min}, ${max})`);
        }
        const span = max - min;
        if (span >= 0x100000000) {
            throw new Error(`nextInt span must be < 2^32, got (${min}, ${max})`);
        }
        return min + this.nextIntBelow(span + 1);
    }

    public pick<T>(arr: readonly T[]): T {
        if (arr.length === 0) {
            throw new Error('pick() requires a non-empty array');
        }
        return arr[this.nextIntBelow(arr.length)];
    }

    /** Fisher–Yates 就地洗牌, 无取模偏差 */
    public shuffleInplace<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = this.nextIntBelow(i + 1);
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    /**
     * 从当前流派生出一个同类型、统计无关的子生成器。
     * 注意: 会推进父流状态，因此连续两次 split() 得到的子流不同。
     */
    public split(): this {
        // 取 3 次输出（每次混合两次 next()，降低弱低位子类的残留相关性）
        const words = [0, 0, 0];
        for (let i = 0; i < words.length; i++) {
            const a = this.next() >>> 0;
            const b = this.next() >>> 0;
            words[i] = (Math.imul(a ^ (a >>> 16), 0x85EBCA6B) ^ b) >>> 0;
        }
        const seed = new Seed(
            BigInt(words[0]) | (BigInt(words[1]) << 32n) | (BigInt(words[2]) << 64n)
        );
        const Ctor = this.constructor as new (seed: Seed, stream?: number) => this;
        return new Ctor(seed, 0);
    }
}
