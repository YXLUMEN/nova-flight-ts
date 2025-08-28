export class MutVec2 {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.y = y;
        this.x = x;
    }

    public clone(): MutVec2 {
        return new MutVec2(this.x, this.y);
    }

    public add(v: MutVec2): MutVec2 {
        return new MutVec2(this.x + v.x, this.y + v.y);
    }

    public sub(v: MutVec2): MutVec2 {
        return new MutVec2(this.x - v.x, this.y - v.y);
    }

    public mul(k: number): MutVec2 {
        return new MutVec2(this.x * k, this.y * k);
    }

    public scale(s: number): MutVec2 {
        return new MutVec2(this.x * s, this.y * s);
    }

    public lengthSq(): number {
        return this.x * this.x + this.y * this.y;
    }

    public length(): number {
        return Math.sqrt(this.lengthSq());
    }

    public normalize(): MutVec2 {
        const len = this.length();
        return len === 0 ? new MutVec2(0, 0) : this.scale(1 / len);
    }

    public static distSq(a: MutVec2, b: MutVec2): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }

    public static zero() {
        return new MutVec2(0, 0);
    }
}
