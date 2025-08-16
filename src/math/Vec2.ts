import type {IVec2} from "./IVec2.ts";

export class Vec2 implements IVec2 {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.y = y;
        this.x = x;
    }

    public clone(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    public add(v: Vec2): Vec2 {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    public sub(v: Vec2): Vec2 {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    public mul(k: number): Vec2 {
        return new Vec2(this.x * k, this.y * k);
    }

    public scale(s: number): Vec2 {
        return new Vec2(this.x * s, this.y * s);
    }

    public lengthSq(): number {
        return this.x * this.x + this.y * this.y;
    }

    public length(): number {
        return Math.sqrt(this.lengthSq());
    }

    public normalize(): Vec2 {
        const len = this.length();
        return len === 0 ? new Vec2(0, 0) : this.scale(1 / len);
    }

    public static distSq(a: Vec2, b: Vec2): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }
}
