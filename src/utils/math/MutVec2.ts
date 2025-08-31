import type {IVec} from "./IVec.ts";

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

    public static distSq(a: IVec, b: IVec): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }

    public static zero(): MutVec2 {
        return new MutVec2(0, 0);
    }

    public clone(): MutVec2 {
        return new MutVec2(this.x, this.y);
    }

    public set(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    }

    public add(x: number, y: number): MutVec2 {
        this.x += x;
        this.y += y;
        return this;
    }

    public addVec(v: IVec): MutVec2 {
        return this.add(v.x, v.y);
    }

    public sub(x: number, y: number): MutVec2 {
        this.x -= x;
        this.y -= y;
        return this;
    }

    public subVec(v: IVec): MutVec2 {
        return this.sub(v.x, v.y);
    }

    public mul(k: number): MutVec2 {
        this.x *= k;
        this.y *= k;
        return this;
    }

    public lengthSq(): number {
        return this.x * this.x + this.y * this.y;
    }

    public length(): number {
        return Math.sqrt(this.lengthSq());
    }

    public normalize(): MutVec2 {
        const len = this.length();
        return len === 0 ? this.set(0, 0) : this.mul(1 / len);
    }

    public equals(v: IVec, epsilon = 1e-6): boolean {
        return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
    }

    public equalsSq(v: IVec, epsilon = 1e-6): boolean {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return (dx * dx + dy * dy) <= (epsilon * epsilon);
    }
}
