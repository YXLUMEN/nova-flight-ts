import {Vec2} from "./Vec2.ts";

export class MutVec2 extends Vec2 {
    declare public x: number;
    declare public y: number;

    public constructor(x: number, y: number) {
        super(x, y);
        this.y = y;
        this.x = x;
    }

    public static zero(): MutVec2 {
        return new MutVec2(0, 0);
    }

    public override clone(): MutVec2 {
        return new MutVec2(this.x, this.y);
    }

    public set(x: number, y: number): this {
        this.x = x;
        this.y = y;
        return this;
    }

    public setVec(vec: Vec2): this {
        this.x = vec.x;
        this.y = vec.y;
        return this;
    }

    public override add(x: number, y: number): this {
        this.x += x;
        this.y += y;
        return this;
    }

    public override addVec(v: Vec2): this {
        return this.add(v.x, v.y);
    }

    public override subtract(x: number, y: number): this {
        this.x -= x;
        this.y -= y;
        return this;
    }

    public override subVec(v: Vec2): this {
        return this.subtract(v.x, v.y);
    }

    public override multiply(k: number): this {
        this.x *= k;
        this.y *= k;
        return this;
    }

    public override multiplyEach(a: number, b: number): this {
        this.x *= a;
        this.y *= b;
        return this;
    }

    public override lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    public override length(): number {
        return Math.hypot(this.x, this.y);
    }

    public override normalize(): this {
        const len = this.length();
        return len === 0 ? this.set(0, 0) : this.multiply(1 / len);
    }

    public override equals(v: Vec2, epsilon = 1e-6): boolean {
        return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
    }

    public equalsSq(v: Vec2, epsilon = 1e-6): boolean {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return (dx * dx + dy * dy) <= (epsilon * epsilon);
    }

    public override toImmut(): Vec2 {
        return new Vec2(this.x, this.y);
    }
}
