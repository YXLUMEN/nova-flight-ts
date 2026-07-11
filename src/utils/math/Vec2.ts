import type {Comparable} from "../../type/Comparable.ts";

export class Vec2 implements Comparable {
    public static readonly ZERO = new Vec2(0, 0);

    public readonly x: number;
    public readonly y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public static formVec(vel: Vec2): Vec2 {
        return new Vec2(vel.x, vel.y);
    }

    public clone() {
        return new Vec2(this.x, this.y);
    }

    public add(x: number, y: number): Vec2 {
        return new Vec2(this.x + x, this.y + y);
    }

    public addVec(v: Vec2) {
        return this.add(v.x, v.y);
    }

    public subtract(x: number, y: number): Vec2 {
        return new Vec2(this.x - x, this.y - y);
    }

    public subVec(v: Vec2): Vec2 {
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

    public epsilonEquals(v: Vec2, epsilon = 1e-6): boolean {
        return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
    }

    public epsilonEqualsSq(v: Vec2, epsilon = 1e-6): boolean {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return (dx * dx + dy * dy) <= (epsilon * epsilon);
    }

    public normalize(): Vec2 {
        const len = this.length();
        return len === 0 ? Vec2.ZERO : this.multiply(1 / len);
    }

    public toImmut(): Vec2 {
        return this;
    }

    public toString(): string {
        return `V[${this.x},${this.y}]`;
    }

    public hashCode(): number {
        return (this.y * 31 + this.x) | 0;
    }

    public equal(other: unknown): boolean {
        if (this === other) return true;
        if (other instanceof Vec2) {
            return this.x === other.x && this.y === other.y;
        }
        return false;
    }

    public quickEquals(other: Vec2): boolean {
        return this.x === other.x && this.y === other.y;
    }

    public static distSq(a: Vec2, b: Vec2): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }
}