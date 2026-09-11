import type {EntityLike} from "./EntityLike.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {Consumer, Predicate} from "../../type/types.ts";
import type {EntityIndex} from "./EntityIndex.ts";

export class GridSpatialIndex<T extends EntityLike> implements EntityIndex<T> {
    private readonly width: number;
    private readonly height: number;
    private readonly cellSize: number;

    private readonly margin: number;
    private readonly mWidth: number;
    private readonly mHeight: number;

    private readonly cols: number;
    private readonly rows: number;
    private readonly grid: Set<T>[][];

    private readonly entityGridCells: Map<T, number[]> = new Map();
    private searchGeneration = 0;

    public constructor(width: number, height: number, cellSize: number = 80, margin: number = 0) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;

        this.margin = margin;
        this.mWidth = this.width + this.margin;
        this.mHeight = this.height + this.margin;

        this.cols = Math.ceil((width + 2 * margin) / this.cellSize);
        this.rows = Math.ceil((height + 2 * margin) / this.cellSize);

        this.grid = Array(this.rows)
            .fill(null)
            .map(() => Array(this.cols)
                .fill(null)
                .map(() => new Set()));
    }

    private toCoord(value: number, maxIndex: number): number {
        return Math.max(0, Math.min(maxIndex, Math.floor((value + this.margin) / this.cellSize)));
    }

    private coveredCells(box: AABB): number[] | null {
        const lo = -this.margin;
        if (box.maxX < lo || box.minX > this.mWidth ||
            box.maxY < lo || box.minY > this.mHeight
        ) return null;

        const c0 = this.toCoord(box.minX, this.cols - 1);
        const r0 = this.toCoord(box.minY, this.rows - 1);
        const c1 = this.toCoord(box.maxX, this.cols - 1);
        const r1 = this.toCoord(box.maxY, this.rows - 1);

        const cells: number[] = [];
        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                cells.push(r, c);
            }
        }
        return cells;
    }

    public insert(entity: T): void {
        this.remove(entity);

        const cells = this.coveredCells(entity.getBoundingBox());
        if (cells === null) return;

        this.entityGridCells.set(entity, cells);
        for (let i = 0; i < cells.length; i += 2) {
            this.grid[cells[i]][cells[i + 1]].add(entity);
        }
    }

    public remove(entity: T): boolean {
        const cells = this.entityGridCells.get(entity);
        if (!cells) return false;

        for (let i = 0; i < cells.length; i += 2) {
            this.grid[cells[i]][cells[i + 1]].delete(entity);
        }
        this.entityGridCells.delete(entity);
        return true;
    }

    public* search(region: AABB) {
        const c0 = this.toCoord(region.minX, this.cols - 1);
        const r0 = this.toCoord(region.minY, this.rows - 1);
        const c1 = this.toCoord(region.maxX, this.cols - 1);
        const r1 = this.toCoord(region.maxY, this.rows - 1);

        if (c0 === c1 && r0 === r1) {
            for (const entity of this.grid[r0][c0]) {
                if (region.intersectsByBox(entity.getBoundingBox())) {
                    yield entity;
                }
            }
            return;
        }

        const gen = ++this.searchGeneration;
        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                for (const entity of this.grid[r][c]) {
                    if (entity.searchGen === gen) continue;
                    if (!region.intersectsByBox(entity.getBoundingBox())) continue;

                    entity.searchGen = gen;
                    yield entity;
                }
            }
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
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c].clear();
            }
        }
        this.entityGridCells.clear();
    }
}