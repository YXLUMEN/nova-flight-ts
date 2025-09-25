import type {IVec} from "./IVec.ts";
import {Vec2} from "./Vec2.ts";

/**
 * 特别注意: 所有方法都会改变值, 需要独立时调用 clone 或使用 Vec2
 * */
export class MutVec2 implements IVec {
    public x: number;
    public y: number;

    public constructor(x: number, y: number) {
        this.y = y;
        this.x = x;
    }

    public clone(): MutVec2 {
        return new MutVec2(this.x, this.y);
    }

    public set(x: number, y: number): this {
        this.x = x;
        this.y = y;
        return this;
    }

    public add(x: number, y: number): this {
        this.x += x;
        this.y += y;
        return this;
    }

    public addVec(v: IVec): this {
        return this.add(v.x, v.y);
    }

    public subtract(x: number, y: number): this {
        this.x -= x;
        this.y -= y;
        return this;
    }

    public subVec(v: IVec): this {
        return this.subtract(v.x, v.y);
    }

    public multiply(k: number): this {
        this.x *= k;
        this.y *= k;
        return this;
    }

    public multiplyEach(a: number, b: number): this {
        this.x *= a;
        this.y *= b;
        return this;
    }

    public lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    public length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    public normalize(): this {
        const len = this.length();
        return len === 0 ? this.set(0, 0) : this.multiply(1 / len);
    }

    public equals(v: IVec, epsilon = 1e-6): boolean {
        return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
    }

    public toImmutable(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    public equalsSq(v: IVec, epsilon = 1e-6): boolean {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return (dx * dx + dy * dy) <= (epsilon * epsilon);
    }

    public static distSq(a: IVec, b: IVec): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }

    public static zero(): MutVec2 {
        return new MutVec2(0, 0);
    }
}
