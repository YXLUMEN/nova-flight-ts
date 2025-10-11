import type {IVec} from "./IVec.ts";
import {MutVec2} from "./MutVec2.ts";

export class Vec2 implements IVec {
    public static readonly ZERO = new Vec2(0, 0);

    public readonly x: number;
    public readonly y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public static formVec(vel: IVec): Vec2 {
        return new Vec2(vel.x, vel.y);
    }

    public clone() {
        return new Vec2(this.x, this.y);
    }

    public add(x: number, y: number): Vec2 {
        return new Vec2(this.x + x, this.y + y);
    }

    public addVec(v: IVec) {
        return this.add(v.x, v.y);
    }

    public subtract(x: number, y: number): Vec2 {
        return new Vec2(this.x - x, this.y - y);
    }

    public subVec(v: IVec): Vec2 {
        return this.subtract(v.x, v.y);
    }

    public multiply(k: number): Vec2 {
        return new Vec2(this.x * k, this.y * k);
    }

    public multiplyEach(a: number, b: number): Vec2 {
        return new Vec2(this.x * a, this.y * b);
    }

    public lengthSquared() {
        return this.x * this.x + this.y * this.y;
    }

    public length() {
        return Math.hypot(this.x, this.y);
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
        return len === 0 ? Vec2.ZERO : this.multiply(1 / len);
    }

    public toMut(): MutVec2 {
        return new MutVec2(this.x, this.y);
    }
}