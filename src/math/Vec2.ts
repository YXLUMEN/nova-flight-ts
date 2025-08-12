export class Vec2 {
    public x: number;

    public y: number;

    constructor(x: number, y: number) {
        this.y = y;
        this.x = x;
    }

    clone() {
        return new Vec2(this.x, this.y);
    }

    add(v: Vec2) {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    sub(v: Vec2) {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    scale(s: number) {
        return new Vec2(this.x * s, this.y * s);
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    length() {
        return Math.sqrt(this.lengthSq());
    }

    normalize() {
        const len = this.length();
        return len === 0 ? new Vec2(0, 0) : this.scale(1 / len);
    }

    static distSq(a: Vec2, b: Vec2): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }
}
