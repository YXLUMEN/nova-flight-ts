import type {BlockPos} from "../../world/section/pos/BlockPos.ts";
import {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
import type {Vec2} from "./Vec2.ts";
import {Direction} from "./Direction.ts";

export class AABB {
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

    public static byVec(pos1: Vec2, pos2: Vec2): AABB {
        return new AABB(pos1.x, pos1.y, pos2.x, pos2.y);
    }

    public static fromCenter(cx: number, cy: number, halfWidth: number, halfHeight: number): AABB {
        return new AABB(
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

    /**
     * @danger 非必要不使用
     * */
    public set(x1: number, y1: number, x2 = x1, y2 = y1): void {
        (this.minX as any) = Math.min(x1, x2);
        (this.minY as any) = Math.min(y1, y2);
        (this.maxX as any) = Math.max(x1, x2);
        (this.maxY as any) = Math.max(y1, y2);
    }

    public getAverageSideLength(): number {
        return (this.getWidth() + this.getHeight()) / 2;
    }

    public intersectsByBox(box: AABB): boolean {
        return this.intersects(box.minX, box.minY, box.maxX, box.maxY);
    }

    public intersects(minX: number, minY: number, maxX: number, maxY: number): boolean {
        return this.minX < maxX && this.maxX > minX && this.minY < maxY && this.maxY > minY;
    }

    public contains(x: number, y: number): boolean {
        return x >= this.minX && x < this.maxX && y >= this.minY && y < this.maxY;
    }

    public containsVec(vec: Vec2): boolean {
        return this.contains(vec.x, vec.y);
    }

    public offset(x: number, y: number): AABB {
        return new AABB(this.minX + x, this.minY + y, this.maxX + x, this.maxY + y);
    }

    public offsetByVec(vec: Vec2): AABB {
        return this.offset(vec.x, vec.y);
    }

    public offsetByBlockPos(blockPos: BlockPos): AABB {
        return new AABB(
            this.minX + blockPos.x,
            this.minY + blockPos.y,
            this.maxX + blockPos.x,
            this.maxY + blockPos.y,
        );
    }

    public expand(x: number, y: number) {
        return new AABB(
            this.minX - x,
            this.minY - y,
            this.maxX + x,
            this.maxY + y
        );
    }

    public expandAll(value: number) {
        return this.expand(value, value);
    }

    public contract(x: number, y: number): AABB {
        return this.expand(-x, -y);
    }

    public contractAll(value: number): AABB {
        return this.expandAll(-value);
    }

    public union(box: AABB) {
        return new AABB(
            Math.min(this.minX, box.minX),
            Math.min(this.minY, box.minY),
            Math.max(this.maxX, box.maxX),
            Math.min(this.maxY, box.maxY)
        );
    }

    public stretch(x: number, y: number): AABB {
        let minX = this.minX;
        let minY = this.minY;
        let maxX = this.maxX;
        let maxY = this.maxY;

        if (x < 0) {
            minX += x;
        } else if (x > 0) {
            maxX += x;
        }

        if (y < 0.0) {
            minY += y;
        } else if (y > 0.0) {
            maxY += y;
        }

        return new AABB(minX, minY, maxX, maxY);
    }

    public stretchByVec(vec: Vec2): AABB {
        return this.stretch(vec.x, vec.y);
    }

    public raycast(min: Vec2, max: Vec2) {
        const ds = [1];
        const d = max.x - min.x;
        const e = max.y - min.y;
        const dir = AABB.traceCollisionSide(this, min, ds, null, d, e);
        if (dir === null) return null;

        const g = ds[0];
        return min.add(g * d, g * e);
    }

    public static raycastEach(boxes: Iterable<AABB>, from: Vec2, to: Vec2, pos: BlockPos) {
        const ds = [1];
        let direction: Direction | null = null;
        const d = to.x - from.x;
        const e = to.y - from.y;

        for (const box of boxes) {
            direction = this.traceCollisionSide(box.offsetByBlockPos(pos), from, ds, direction, d, e);
        }

        if (direction === null) return null;
        const g = ds[0];
        return new BlockHitResult(from.add(g * d, g * e), direction, pos, false);
    }

    public static traceCollisionSide(
        box: AABB,
        intersectingVector: Vec2,
        bestT: number[],
        approachDirection: Direction | null,
        deltaX: number,
        deltaY: number
    ): Direction | null {
        if (deltaX > 1E-7) {
            approachDirection = this.traceSide(
                bestT,
                approachDirection,
                deltaX,
                deltaY,
                box.minX,
                box.minY,
                box.maxY,
                Direction.RIGHT,
                intersectingVector.x,
                intersectingVector.y,
            );
        } else if (deltaX < -1.0E-7) {
            approachDirection = this.traceSide(
                bestT,
                approachDirection,
                deltaX,
                deltaY,
                box.maxX,
                box.minY,
                box.maxY,
                Direction.LEFT,
                intersectingVector.x,
                intersectingVector.y,
            );
        }

        if (deltaY > 1.0E-7) {
            approachDirection = this.traceSide(
                bestT,
                approachDirection,
                deltaY,
                deltaX,
                box.minY,
                box.minX,
                box.maxX,
                Direction.UP,
                intersectingVector.y,
                intersectingVector.x
            );
        } else if (deltaY < -1.0E-7) {
            approachDirection = this.traceSide(
                bestT,
                approachDirection,
                deltaY,
                deltaX,
                box.maxY,
                box.minX,
                box.maxX,
                Direction.DOWN,
                intersectingVector.y,
                intersectingVector.x
            );
        }

        return approachDirection;
    }

    private static traceSide(
        bestT: number[],
        approachDirection: Direction | null,
        deltaX: number,
        deltaY: number,
        begin: number,
        minY: number,
        maxY: number,
        resultDirection: Direction,
        startX: number,
        startY: number
    ): Direction | null {
        const t = (begin - startX) / deltaX;
        const hit = startY + t * deltaY;
        if (0.0 < t && t < bestT[0] && minY - 1.0E-7 < hit && hit < maxY + 1.0E-7) {
            bestT[0] = t;
            return resultDirection;
        }
        return approachDirection;
    }
}