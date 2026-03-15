import {BitBlockMap} from "../map/BitBlockMap.ts";
import {Box} from "../../utils/math/Box.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {BlockPos} from "../map/BlockPos.ts";
import {fractionalPart, lerp} from "../../utils/math/math.ts";
import {MutBlockPos} from "../map/MutBlockPos.ts";
import type {RaycastContext} from "./RaycastContext.ts";
import {BlockHitResult} from "./BlockHitResult.ts";
import {type Direction, Directions, getFacing} from "./Direction.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export class BlockCollision {
    public static fastCollision(map: BitBlockMap, bounds: Box, movement: IVec): boolean {
        if (movement.x === 0 && movement.y === 0) return false;
        const nextBox = bounds.stretch(movement.x, movement.y);
        return map.intersectsBox(nextBox);
    }

    public static separatingCollision(map: BitBlockMap, bounds: Box, movement: IVec): IVec {
        if (movement.x === 0 && movement.y === 0) return movement;

        const adjusted = movement.toMut();
        if (movement.x !== 0) {
            const xBox = bounds.offset(movement.x, 0);
            if (map.intersectsBox(xBox)) {
                adjusted.x = 0;
            }
        }

        if (movement.y !== 0) {
            const yBox = bounds.offset(0, movement.y);
            if (map.intersectsBox(yBox)) {
                adjusted.y = 0;
            }
        }

        return adjusted;
    }

    public static raycast<T, C>(
        start: IVec,
        end: IVec,
        context: C,
        forHit: (ctx: C, pos: BlockPos, t: number, dir: Direction) => T | null,
        forMiss: (ctx: C) => T
    ): T {
        if (start.equals(end)) return forMiss(context);
        const ox = lerp(-1.0E-7, start.x, end.x);
        const oy = lerp(-1.0E-7, start.y, end.y);

        let cellX = Math.floor(ox);
        let cellY = Math.floor(oy);

        const mutPos = MutBlockPos.align(cellX, cellY);
        let ctx = forHit(context, mutPos, 0, Directions.NORTH);
        if (ctx !== null) return ctx;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);

        const deltaDistX = stepX === 0 ? Infinity : stepX / dx;
        const deltaDistY = stepY === 0 ? Infinity : stepY / dy;

        let distX = deltaDistX * (stepX > 0 ? 1.0 - fractionalPart(ox) : fractionalPart(ox));
        let distY = deltaDistY * (stepY > 0 ? 1.0 - fractionalPart(oy) : fractionalPart(oy));

        let t: number;
        let dir: Direction;
        let step = 30;
        while (distX <= 1.0 || distY <= 1.0 || step >= 0) {
            step--;
            if (distX < distY) {
                cellX += stepX;
                t = distX;
                distX += deltaDistX;
                dir = stepX > 0 ? Directions.WEST : Directions.EAST;
            } else {
                cellY += stepY;
                t = distY;
                distY += deltaDistY;
                dir = stepY > 0 ? Directions.NORTH : Directions.SOUTH;
            }

            ctx = forHit(context, mutPos.setPixel(cellX, cellY), t, dir);
            if (ctx !== null) return ctx;
        }

        return forMiss(context);
    }

    private static computeHitResult(
        start: Vec2,
        end: Vec2,
        blockPos: BlockPos,
        t: number,
        enteringFrom: Direction
    ) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const hitPos = new Vec2(start.x + t * dx, start.y + t * dy);
        return new BlockHitResult(hitPos, enteringFrom, blockPos, false);
    }

    public static raycastBlock(context: RaycastContext): BlockHitResult {
        return this.raycast(context.start, context.end, context, (innerContext, pos, t, dir) => {
            const block = innerContext.map.get(pos.getX(), pos.getY());
            if (block === 0) return null;
            return this.computeHitResult(context.start, context.end, pos, t, dir);
        }, innerContext => {
            const vec = innerContext.start.subVec(innerContext.end);
            return BlockHitResult.missed(innerContext.end, getFacing(vec.x, vec.y), BlockPos.fromVec(innerContext.end));
        });
    }
}
