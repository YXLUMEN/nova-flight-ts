import {BitBlockMap} from "../section/BitBlockMap.ts";
import {AABB} from "../../utils/math/AABB.ts";
import {BlockPos} from "../section/pos/BlockPos.ts";
import {clamp, frac, lerp} from "../../utils/math/math.ts";
import {MutBlockPos} from "../section/pos/MutBlockPos.ts";
import type {RaycastContext} from "./RaycastContext.ts";
import {BlockHitResult} from "./BlockHitResult.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {World} from "../World.ts";
import {Direction} from "../../utils/math/Direction.ts";
import {WorldConstants} from "../section/WorldConstants.ts";

export class BlockCollision {
    private static readonly CONTACT_EPS = 1E-5;

    public static fastCollision(map: BitBlockMap, bounds: AABB, movement: Vec2): boolean {
        if (movement.x === 0 && movement.y === 0) return false;
        const nextBox = bounds.stretch(movement.x, movement.y);
        return map.intersectsBox(nextBox);
    }

    public static separatingCollision(map: BitBlockMap, bounds: AABB, movement: MutVec2): MutVec2 {
        if (movement.x !== 0) movement.x = BlockCollision.sweepX(map, bounds, movement.x);
        if (movement.y !== 0) movement.y = BlockCollision.sweepY(map, bounds, movement.x, movement.y);
        return movement;
    }

    /** 把 "行进到接触点" 换算成实际位移 */
    private static contactMove(blockIndex: number, dir: number, lead: number, delta: number): number {
        const bs = WorldConstants.BLOCK_SIZE;
        const contact = dir > 0 ? blockIndex * bs : (blockIndex + 1) * bs;
        const allowed = contact - lead - dir * BlockCollision.CONTACT_EPS;
        return dir > 0 ? clamp(allowed, 0, delta) : clamp(allowed, delta, 0);
    }

    private static sweepX(map: BitBlockMap, bounds: AABB, delta: number): number {
        const bs = WorldConstants.BLOCK_SIZE;
        const eps = BlockCollision.CONTACT_EPS;
        const dir = delta > 0 ? 1 : -1;

        const lead = dir > 0 ? bounds.maxX : bounds.minX;   // 行进方向的前沿坐标
        const first = Math.floor(lead / bs);                // 前沿起始格
        const last = Math.floor((lead + delta) / bs);       // 前沿终点格

        // 垂直方向覆盖的格, EPS 排除擦边
        const low = Math.floor((bounds.minY + eps) / bs);
        const high = Math.floor((bounds.maxY - eps) / bs);

        // 逐行找该行最靠前的阻挡格, 跨行取最近的那个 (best 单调收敛, 后续行的扫描范围可收窄)
        if (dir > 0) {
            let best = last + 1;
            for (let row = low; row <= high; row++) {
                for (let col = first; col < best; col++) {
                    if (map.get(col, row) !== 0) {
                        best = col;
                        break;
                    }
                }
            }
            return best > last ? delta : BlockCollision.contactMove(best, dir, lead, delta);
        }

        let best = last - 1;
        for (let row = low; row <= high; row++) {
            for (let col = first; col > best; col--) {
                if (map.get(col, row) !== 0) {
                    best = col;
                    break;
                }
            }
        }
        return best < last ? delta : BlockCollision.contactMove(best, dir, lead, delta);
    }

    private static sweepY(map: BitBlockMap, bounds: AABB, shiftX: number, delta: number): number {
        const bs = WorldConstants.BLOCK_SIZE;
        const eps = BlockCollision.CONTACT_EPS;
        const dir = delta > 0 ? 1 : -1;

        const lead = dir > 0 ? bounds.maxY : bounds.minY;
        const first = Math.floor(lead / bs);
        const last = Math.floor((lead + delta) / bs);

        const low = Math.floor((bounds.minX + shiftX + eps) / bs);
        const high = Math.floor((bounds.maxX + shiftX - eps) / bs);

        if (dir > 0) {
            let best = last + 1;
            for (let col = low; col <= high; col++) {
                for (let row = first; row < best; row++) {
                    if (map.get(col, row) !== 0) {
                        best = row;
                        break;
                    }
                }
            }
            return best > last ? delta : BlockCollision.contactMove(best, dir, lead, delta);
        }

        let best = last - 1;
        for (let col = low; col <= high; col++) {
            for (let row = first; row > best; row--) {
                if (map.get(col, row) !== 0) {
                    best = row;
                    break;
                }
            }
        }
        return best < last ? delta : BlockCollision.contactMove(best, dir, lead, delta);
    }

    public static findEjectionVector(
        map: BitBlockMap,
        pos: Vec2,
        box: AABB,
        maxBlocks: number = 32
    ): MutVec2 | null {
        const blockSize = WorldConstants.BLOCK_SIZE;
        const worldW = World.MAP_WIDTH;
        const worldH = World.MAP_HEIGHT;

        maxBlocks = Math.ceil(maxBlocks);

        let bestEject: MutVec2 | null = null;
        let minDist = maxBlocks + 1;

        for (const dir of Direction.ALL_DIRS) {
            const dx = dir.normal.x;
            const dy = dir.normal.y;

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

    public static pushOutOfBlocks(map: BitBlockMap, bounds: AABB, x: number, y: number) {
        const box = bounds.contractAll(1E-7);
        if (!map.intersectsBox(box)) return null;

        const blockSize = WorldConstants.BLOCK_SIZE;
        const dx = x % blockSize;
        const dy = y % blockSize;

        let pushDir: Direction | null = null;
        let dist = Infinity;

        for (const direction of Direction.ALL_DIRS) {
            const g = direction.normal.x === 0 ? dy : dx;
            const h = direction.dir === 1 ? 1 - g : g;
            const offsetBox = box.offset(direction.normal.x * blockSize, direction.normal.y * blockSize);
            if (h < dist && !map.intersectsBox(offsetBox)) {
                dist = h;
                pushDir = direction;
            }
        }

        return pushDir === null ? null : pushDir.normal;
    }

    public static raycast<T, C>(
        start: Vec2,
        end: Vec2,
        context: C,
        forHit: (ctx: C, pos: BlockPos, t: number, dir: Direction) => T | null,
        forMiss: (ctx: C) => T
    ): T {
        if (start.valueEquals(end)) return forMiss(context);
        const ox = lerp(-1.0E-7, start.x, end.x);
        const oy = lerp(-1.0E-7, start.y, end.y);

        let cellX = Math.floor(ox);
        let cellY = Math.floor(oy);

        const mutPos = MutBlockPos.align(cellX, cellY);
        let ctx = forHit(context, mutPos, 0, Direction.DOWN);
        if (ctx !== null) return ctx;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);

        const deltaDistX = stepX === 0 ? Infinity : stepX / dx;
        const deltaDistY = stepY === 0 ? Infinity : stepY / dy;

        let distX = stepX === 0 ? Infinity : deltaDistX * (stepX > 0 ? 1.0 - frac(ox) : frac(ox));
        let distY = stepY === 0 ? Infinity : deltaDistY * (stepY > 0 ? 1.0 - frac(oy) : frac(oy));

        let t: number;
        let dir: Direction;
        while (distX <= 1.0 || distY <= 1.0) {
            if (distX < distY) {
                cellX += stepX;
                t = distX;
                distX += deltaDistX;
                dir = stepX > 0 ? Direction.RIGHT : Direction.LEFT;
            } else {
                cellY += stepY;
                t = distY;
                distY += deltaDistY;
                dir = stepY > 0 ? Direction.DOWN : Direction.UP;
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
        return new BlockHitResult(hitPos, enteringFrom, blockPos, t === 0);
    }

    public static raycastBlock(context: RaycastContext): BlockHitResult {
        return this.raycast(context.start, context.end, context, (innerContext, pos, t, dir) => {
            const block = innerContext.map.get(pos.x, pos.y);
            if (block === 0) return null;
            return this.computeHitResult(context.start, context.end, pos, t, dir);
        }, innerContext => {
            const vec = innerContext.start.subVec(innerContext.end);
            return BlockHitResult.missed(innerContext.end, Direction.getFacing(vec.x, vec.y), BlockPos.fromVec(innerContext.end));
        });
    }
}
