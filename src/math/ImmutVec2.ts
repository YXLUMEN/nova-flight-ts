import type {IVec2} from "./IVec2.ts";

export class ImmutVec2 implements IVec2 {
    public static readonly ZERO = new ImmutVec2(0, 0);

    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public clone() {
        return new ImmutVec2(this.x, this.y);
    }

    public add(v: ImmutVec2) {
        return new ImmutVec2(this.x + v.x, this.y + v.y);
    }

    public sub(v: ImmutVec2) {
        return new ImmutVec2(this.x - v.x, this.y - v.y);
    }

    public mul(k: number): ImmutVec2 {
        return new ImmutVec2(this.x * k, this.y * k);
    }

    public scale(s: number) {
        return new ImmutVec2(this.x * s, this.y * s);
    }

    public lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    public length() {
        return Math.sqrt(this.lengthSq());
    }

    public normalize() {
        const len = this.length();
        return len === 0 ? ImmutVec2.ZERO : this.scale(1 / len);
    }
}