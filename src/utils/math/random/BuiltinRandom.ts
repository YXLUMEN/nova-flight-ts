import {Random} from "./Random.ts";
import {randInt} from "../math.ts";
import {shuffleArray} from "../../util.ts";

export class BuiltinRandom extends Random {
    public next(): number {
        return (Math.random() * 0x100000000) >>> 0;
    }

    public override nextDouble(): number {
        return Math.random();
    }

    public override nextFloat(): number {
        return Math.random();
    }

    public override nextBool(probability: number = 0.5): boolean {
        return Math.random() < probability;
    }

    public override nextInt(min: number, max: number): number {
        if (max < min) {
            throw new Error(`nextInt requires min <= max, got (${min}, ${max})`);
        }
        return randInt(min, max);
    }

    public override pick<T>(arr: readonly T[]): T {
        if (arr.length === 0) {
            throw new Error('pick() requires a non-empty array');
        }
        return arr[this.nextInt(0, arr.length - 1)];
    }

    public override shuffleInplace<T>(arr: T[]): T[] {
        return shuffleArray(arr);
    }
}