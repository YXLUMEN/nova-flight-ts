import type {IVec} from "./IVec.ts";

export class Vec2 implements IVec {
    public static readonly ZERO = new Vec2(0, 0);

    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public static formVec(vel: IVec): Vec2 {
        return new Vec2(vel.x, vel.y);
    }

    public clone() {
        return new Vec2(this.x, this.y);
    }

    public add(x: number, y: number): IVec {
        return new Vec2(this.x + x, this.y + y);
    }

    public addVec(v: IVec) {
        return this.add(v.x, v.y);
    }

    public sub(x: number, y: number): IVec {
        return new Vec2(this.x - x, this.y - y);
    }

    public subVec(v: IVec) {
        return this.sub(v.x, v.y);
    }

    public mul(k: number): Vec2 {
        return new Vec2(this.x * k, this.y * k);
    }

    public lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    public length() {
        return Math.sqrt(this.lengthSq());
    }

    public equals(v: IVec, epsilon = 1e-6): boolean {
        return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
    }

    public equalsSq(v: IVec, epsilon = 1e-6): boolean {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return (dx * dx + dy * dy) <= (epsilon * epsilon);
    }

    public normalize() {
        const len = this.length();
        return len === 0 ? Vec2.ZERO : this.mul(1 / len);
    }
}