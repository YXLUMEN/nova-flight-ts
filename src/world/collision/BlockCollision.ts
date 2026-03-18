import {BitBlockMap} from "../map/BitBlockMap.ts";
import {Box} from "../../utils/math/Box.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {BlockPos} from "../map/BlockPos.ts";
import {fractionalPart, lerp} from "../../utils/math/math.ts";
import {MutBlockPos} from "../map/MutBlockPos.ts";
import type {RaycastContext} from "./RaycastContext.ts";
import {BlockHitResult} from "./BlockHitResult.ts";
import {AllDirs, type Direction, Directions, getFacing} from "./Direction.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

export class BlockCollision {
    public static fastCollision(map: BitBlockMap, bounds: Box, movement: IVec): boolean {
        if (movement.x === 0 && movement.y === 0) return false;
        const nextBox = bounds.stretch(movement.x, movement.y);
        return map.intersectsBox(nextBox);
    }

    public static separatingCollision(map: BitBlockMap, bounds: Box, movement: MutVec2): MutVec2 {
        if (movement.x === 0 && movement.y === 0) return movement;

        if (movement.x !== 0) {
            const xBox = bounds.offset(movement.x, 0);
            if (map.intersectsBox(xBox)) movement.x = 0;
        }

        if (movement.y !== 0) {
            const yBox = bounds.offset(0, movement.y);
            if (map.intersectsBox(yBox)) movement.y = 0;
        }

        return movement;
    }

    public static findEjectionVector(
        map: BitBlockMap,
        pos: IVec,
        box: Box,
        maxRadius: number = 64
    ): MutVec2 | null {
        const stepSize = 8;
        const steps = Math.ceil(maxRadius / stepSize);

        let bestEject: MutVec2 | null = null;
        let minDistSq = maxRadius * maxRadius + 1;

        const testPos = MutVec2.zero();

        for (const dir of AllDirs) {
            const dx = dir.dir.x;
            const dy = dir.dir.y;

            for (let i = 1; i <= steps; i++) {
                const dist = i * stepSize;
                const distSq = dist * dist;
                if (distSq >= minDistSq) {
                    break;
                }

                testPos.set(pos.x + dx * dist, pos.y + dy * dist);
                const offsetBox = box.offset(testPos.x - pos.x, testPos.y - pos.y);

                if (map.intersectsBox(offsetBox)) continue;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    if (bestEject === null) {
                        bestEject = new MutVec2(dx * dist, dy * dist);
                    } else {
                        bestEject.set(dx * dist, dy * dist);
                    }
                }
                break;
            }
        }

        return bestEject;
    }

    public static pushOutOfBlocks(map: BitBlockMap, bounds: Box, x: number, y: number) {
        const box = bounds.contractAll(1E-7);
        if (!map.intersectsBox(box)) return;
        const dx = x % 8;
        const dy = y % 8;

        let pushDir: Direction | null = null;
        let dist = Infinity;

        for (const direction of AllDirs) {
            const g = direction.dir.x === 0 ? dy : dx;
            const h = direction.direction === 1 ? 1 - g : g;
            if (h < dist && !map.intersectsBox(box.offset(direction.dir.x * 8, direction.dir.y * 8))) {
                dist = h;
                pushDir = direction;
            }
        }

        if (pushDir) {
            return pushDir.dir;
        }
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
