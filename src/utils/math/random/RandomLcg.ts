import type {Seed} from "./Seed.ts";
import {Random} from "./Random.ts";

/**
 * 32-bit LCG + 输出混合
 * 需要更长周期时 (> 2^32) 请直接用 RngXor (周期 2^128-1)
 */
export class RandomLcg extends Random {
    private static readonly A = 1664525;
    private static readonly C = 1013904223;

    private state: number;

    public constructor(seed: Seed, stream: number = 0) {
        super();
        this.state = seed.expand(1, stream)[0];
    }

    public next(): number {
        this.state = (Math.imul(RandomLcg.A, this.state) + RandomLcg.C) >>> 0;

        // 输出混合
        let z = this.state;
        z = Math.imul(z ^ (z >>> 16), 0x85EBCA6B) >>> 0;
        z = Math.imul(z ^ (z >>> 13), 0xC2B2AE35) >>> 0;
        return (z ^ (z >>> 16)) >>> 0;
    }
}
