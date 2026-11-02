import type {Seed} from "./Seed.ts";
import {Random} from "./Random.ts";

export class RandomXor32 extends Random {
    private state: number;

    public constructor(seed: Seed, stream: number = 0) {
        super();
        this.state = seed.expand(1, stream)[0] | 0;
    }

    public next(): number {
        let x = this.state;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.state = x;
        return x >>> 0;
    }
}