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
import {World} from "../World.ts";

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
        maxBlocks: number = 32
    ): MutVec2 | null {
        const blockSize = BitBlockMap.BLOCK_SIZE;
        const worldW = World.WORLD_W;
        const worldH = World.WORLD_H;

        maxBlocks = Math.ceil(maxBlocks);

        let bestEject: MutVec2 | null = null;
        let minDist = maxBlocks + 1;

        for (const dir of AllDirs) {
            const dx = dir.dir.x;
            const dy = dir.dir.y;

            for (let step = 1; step <= maxBlocks; step++) {
                if (step >= minDist) break;

                const candidateX = pos.x + dx * step * blockSize;
                const candidateY = pos.y + dy * step * blockSize;
                const offsetBox = box.offset(candidateX - pos.x, candidateY - pos.y);
                if (
                    offsetBox.minX < 0 ||
                    offsetBox.minY < 0 ||
                    offsetBox.maxX > worldW ||
                    offsetBox.maxY > worldH
                ) break;

                if (map.intersectsBox(offsetBox)) continue;
                if (step < minDist) {
                    minDist = step;
                    if (bestEject === null) {
                        bestEject = new MutVec2(dx * step * blockSize, dy * step * blockSize);
                    } else {
                        bestEject.set(dx * step * blockSize, dy * step * blockSize);
                    }
                    break;
                }
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
