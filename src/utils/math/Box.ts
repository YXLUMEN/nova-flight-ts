import type {Vec2} from "./Vec2.ts";

export class Box {
    public readonly minX: number;
    public readonly minY: number;
    public readonly maxX: number;
    public readonly maxY: number;

    public constructor(x1: number, y1: number, x2 = x1, y2 = y1) {
        this.minX = Math.min(x1, x2);
        this.minY = Math.min(y1, y2);
        this.maxX = Math.max(x1, x2);
        this.maxY = Math.max(y1, y2);
    }

    public static byVec2(pos1: Vec2, pos2: Vec2) {
        return new Box(pos1.x, pos1.y, pos2.x, pos2.y);
    }

    public intersectsByBox(box: Box): boolean {
        return this.intersects(box.minX, box.minY, box.maxX, box.maxY);
    }

    public intersects(minX: number, minY: number, maxX: number, maxY: number) {
        return this.minX < maxX && this.maxX > minX && this.minY < maxY && this.maxY > minY;
    }

    public expand(x: number, y: number) {
        return new Box(
            this.minX - x,
            this.minY - y,
            this.maxX + x,
            this.maxY + y
        );
    }

    public expandAll(value: number) {
        return this.expand(value, value);
    }
}