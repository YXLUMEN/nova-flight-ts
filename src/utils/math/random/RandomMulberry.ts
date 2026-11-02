import type {Seed} from "./Seed.ts";
import {Random} from "./Random.ts";

export class RandomMulberry extends Random {
    private state: number;

    public constructor(seed: Seed, stream: number = 0) {
        super();
        this.state = seed.expand(1, stream)[0] | 0;
    }

    public next(): number {
        const state = (this.state + 0x6D2B79F5) | 0;
        this.state = state;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = ((t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t) | 0;
        return (t ^ (t >>> 14)) >>> 0;
    }
}
