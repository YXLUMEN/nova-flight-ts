import type {MutVec2} from "./MutVec2.ts";

export class Vec2 {
    public static readonly ZERO = new Vec2(0, 0);

    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public clone() {
        return new Vec2(this.x, this.y);
    }

    public add(v: Vec2) {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    public sub(v: Vec2) {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    public mul(k: number): Vec2 {
        return new Vec2(this.x * k, this.y * k);
    }

    public scale(s: number) {
        return new Vec2(this.x * s, this.y * s);
    }

    public lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    public length() {
        return Math.sqrt(this.lengthSq());
    }

    public normalize() {
        const len = this.length();
        return len === 0 ? Vec2.ZERO : this.scale(1 / len);
    }

    public static formVec(vel: MutVec2 | Vec2): Vec2 {
        return new Vec2(vel.x, vel.y);
    }
}