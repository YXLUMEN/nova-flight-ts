import type {IVec} from "./IVec.ts";

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

    public static byVec(pos1: IVec, pos2: IVec) {
        return new Box(pos1.x, pos1.y, pos2.x, pos2.y);
    }

    public static fromCenter(cx: number, cy: number, halfWidth: number, halfHeight: number): Box {
        return new Box(
            cx - halfWidth,
            cy - halfHeight,
            cx + halfWidth,
            cy + halfHeight
        );
    }

    public getWidth(): number {
        return this.maxX - this.minX;
    }

    public getHeight(): number {
        return this.maxY - this.minY;
    }

    public intersectsByBox(box: Box): boolean {
        return this.intersects(box.minX, box.minY, box.maxX, box.maxY);
    }

    public intersects(minX: number, minY: number, maxX: number, maxY: number) {
        return this.minX < maxX && this.maxX > minX && this.minY < maxY && this.maxY > minY;
    }

    public contains(x: number, y: number): boolean {
        return x >= this.minX && x < this.maxX && y >= this.minY && y < this.maxY;
    }

    public offset(x: number, y: number): Box {
        return new Box(this.minX + x, this.minY + y, this.maxX + x, this.maxY + y);
    }

    public offsetByVec(vec: IVec): Box {
        return this.offset(vec.x, vec.y);
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

    public union(box: Box) {
        return new Box(
            Math.min(this.minX, box.minX),
            Math.min(this.minY, box.minY),
            Math.max(this.maxX, box.maxX),
            Math.min(this.maxY, box.maxY)
        );
    }
}