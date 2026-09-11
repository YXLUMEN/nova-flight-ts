import type {Consumer, Predicate} from "../../type/types.ts";
import type {EntityLike} from "./EntityLike.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {EntityIndex} from "./EntityIndex.ts";

export class PackedSpatialIndex<T extends EntityLike> implements EntityIndex<T> {
    /** half 硬上限: 47,453,132 */
    private static readonly MAX_HALF = Math.floor((Math.sqrt(Number.MAX_SAFE_INTEGER + 1) - 1) / 2);

    private readonly cellSize: number;

    /** 单轴半宽（格数）。cell 坐标会被 clamp 到 [-half, half]，共 2*half+1 列/行 */
    private readonly half: number;

    /** stride = 2*half + 1，保证 (cx+half)*stride 与 (cy+half) 互不串位 */
    private readonly stride: number;

    private readonly buckets: Map<number, Set<T>> = new Map();
    private readonly entityCells: Map<T, number[]> = new Map();

    private searchGeneration = 0;

    /**
     * @param cellSize 格子边长(世界单位), 必须为正有限数，默认 80
     * @param half     单轴半宽(格数), 必须为 `[1, MAX_HALF]` 内的整数，默认 `2^13 = 8192`.
     *                 可支持的世界范围约为 `±half * cellSize`:
     *                   - 默认值下 `cellSize = 1` 时: `±8192`; `cellSize = 80` 时：`±655,360 px`
     *                 SMI 档位说明
     *                   - `half <= 16383`: key 为 SMI
     *                   - `16383 < half <= 47,453,132`: 仍然精确无碰撞, 仅 key 变为 heap double;
     *                   - `half > 47,453,132`: key 越出 2^53 精确整数范围抛出 RangeError.
     */
    public constructor(cellSize: number = 80, half: number = 1 << 13) {
        PackedSpatialIndex.assert(cellSize, half);
        this.cellSize = cellSize;
        this.half = half;
        this.stride = half * 2 + 1; // keyMax = 4·half·(half+1) ≤ 2^53−1
    }

    private static assert(cellSize: number, half: number): void {
        if (!Number.isFinite(cellSize) || cellSize <= 0) {
            throw new RangeError(`PackedSpatialIndex: cellSize 必须为正有限数（收到 ${cellSize}）`);
        }
        if (!Number.isSafeInteger(half) || half < 1 || half > this.MAX_HALF) {
            throw new RangeError(`PackedSpatialIndex: half 必须为 [1, ${this.MAX_HALF}] 内的整数`);
        }
    }

    /** 世界坐标 -> 格坐标. 超出范围钳置到边界格 */
    private cellOf(value: number): number {
        const c = Math.floor(value / this.cellSize);
        return c < -this.half ? -this.half : c > this.half ? this.half : c;
    }

    private keyOf(cx: number, cy: number): number {
        return (cx + this.half) * this.stride + (cy + this.half);
    }

    public insert(entity: T): void {
        this.remove(entity);

        const box = entity.getBoundingBox();
        const c0 = this.cellOf(box.minX);
        const r0 = this.cellOf(box.minY);
        const c1 = this.cellOf(box.maxX);
        const r1 = this.cellOf(box.maxY);

        const keys: number[] = [];

        let keyRow = this.keyOf(c0, r0);
        for (let r = r0; r <= r1; r++) {
            let key = keyRow;

            for (let c = c0; c <= c1; c++) {
                keys.push(key);
                this.buckets.getOrInsertComputed(key, this.create).add(entity);
                key += this.stride; // 列步进
            }
            keyRow += 1; // 行步进
        }
        this.entityCells.set(entity, keys);
    }

    public remove(entity: T): boolean {
        const keys = this.entityCells.get(entity);
        if (!keys) return false;

        for (const key of keys) {
            const bucket = this.buckets.get(key);
            if (!bucket) continue;

            bucket.delete(entity);
            if (bucket.size === 0) this.buckets.delete(key);
        }
        this.entityCells.delete(entity);
        return true;
    }

    public* search(region: AABB) {
        const c0 = this.cellOf(region.minX);
        const r0 = this.cellOf(region.minY);
        const c1 = this.cellOf(region.maxX);
        const r1 = this.cellOf(region.maxY);

        if (c0 === c1 && r0 === r1) {
            const bucket = this.buckets.get(this.keyOf(c0, r0));
            if (!bucket) return;

            for (const entity of bucket) {
                if (region.intersectsByBox(entity.getBoundingBox())) {
                    yield entity;
                }
            }
            return;
        }

        const gen = ++this.searchGeneration;

        let keyRow = this.keyOf(c0, r0);
        for (let r = r0; r <= r1; r++) {
            let key = keyRow;

            for (let c = c0; c <= c1; c++) {
                const bucket = this.buckets.get(key);
                key += this.stride;
                if (!bucket) continue;

                for (const entity of bucket) {
                    if (entity.searchGen === gen) continue;
                    if (!region.intersectsByBox(entity.getBoundingBox())) continue;

                    entity.searchGen = gen;
                    yield entity;
                }
            }
            keyRow += 1;
        }
    }

    public forEach(region: AABB, consumer: Consumer<T>): void {
        for (const entity of this.search(region)) {
            consumer(entity);
        }
    }

    public findFirst(region: AABB, predicate: Predicate<T>): void {
        for (const entity of this.search(region)) {
            if (predicate(entity)) return;
        }
    }

    public clear(): void {
        this.buckets.clear();
        this.entityCells.clear();
        this.searchGeneration = 0;
    }

    private create() {
        return new Set<T>();
    }
}
