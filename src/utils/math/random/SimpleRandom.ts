import {Random} from "./Random.ts";

export class SimpleRandom extends Random {
    private state: number;

    public constructor(seed: number) {
        super();
        this.state = seed || 1;
    }

    public next(): number {
        let x = this.state;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.state = x;
        return x >>> 0;
    }

    public setState(state: number) {
        this.state = state;
    }
}
