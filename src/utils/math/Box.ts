import type {IVec} from "./IVec.ts";
import {type Direction, Directions} from "../../world/collision/Direction.ts";
import type {BlockPos} from "../../world/map/BlockPos.ts";
import {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
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

    public getAverageSideLength(): number {
        return (this.getWidth() + this.getHeight()) / 2;
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

    public offsetByBlockPos(blockPos: BlockPos): Box {
        return new Box(
            this.minX + blockPos.getX(),
            this.minY + blockPos.getY(),
            this.maxX + blockPos.getX(),
            this.maxY + blockPos.getY(),
        );
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

    public stretch(x: number, y: number): Box {
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

        return new Box(minX, minY, maxX, maxY);
    }

    public stretchByVec(vec: IVec): Box {
        return this.stretch(vec.x, vec.y);
    }

    public raycast(min: IVec, max: IVec) {
        const ds = [1];
        const d = max.x - min.x;
        const e = max.y - min.y;
        const dir = Box.traceCollisionSide(this, min, ds, null, d, e);
        if (dir === null) return null;

        const g = ds[0];
        return min.add(g * d, g * e);
    }

    public static raycastEach(boxes: Iterable<Box>, from: Vec2, to: Vec2, pos: BlockPos) {
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
        box: Box,
        intersectingVector: IVec,
        traceDistanceResult: number[],
        approachDirection: Direction | null,
        deltaX: number,
        deltaY: number
    ): Direction | null {
        if (deltaX > 1E-7) {
            approachDirection = this.traceSide(
                traceDistanceResult,
                approachDirection,
                deltaX,
                deltaY,
                box.minX,
                box.minY,
                box.maxY,
                Directions.WEST,
                intersectingVector.x,
                intersectingVector.y,
            );
        } else if (deltaX < -1.0E-7) {
            approachDirection = this.traceSide(
                traceDistanceResult,
                approachDirection,
                deltaX,
                deltaY,
                box.maxX,
                box.minY,
                box.maxY,
                Directions.EAST,
                intersectingVector.x,
                intersectingVector.y,
            );
        }

        if (deltaY > 1.0E-7) {
            approachDirection = this.traceSide(
                traceDistanceResult,
                approachDirection,
                deltaY,
                deltaX,
                box.minY,
                box.minX,
                box.maxX,
                Directions.SOUTH,
                intersectingVector.y,
                intersectingVector.x
            );
        } else if (deltaY < -1.0E-7) {
            approachDirection = this.traceSide(
                traceDistanceResult,
                approachDirection,
                deltaY,
                deltaX,
                box.maxY,
                box.minX,
                box.maxX,
                Directions.NORTH,
                intersectingVector.y,
                intersectingVector.x
            );
        }

        return approachDirection;
    }

    private static traceSide(
        traceDistanceResult: number[],
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
        const d = (begin - startX) / deltaX;
        const e = startY + d * deltaY;
        if (0.0 < d && d < traceDistanceResult[0] && minY - 1.0E-7 < e && e < maxY + 1.0E-7) {
            traceDistanceResult[0] = d;
            return resultDirection;
        } else {
            return approachDirection;
        }
    }
}