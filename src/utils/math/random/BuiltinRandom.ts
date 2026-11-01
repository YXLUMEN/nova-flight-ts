import {Random} from "./Random.ts";

export class BuiltinRandom extends Random {
    public next(): number {
        return (Math.random() * 0x100000000) >>> 0;
    }
}