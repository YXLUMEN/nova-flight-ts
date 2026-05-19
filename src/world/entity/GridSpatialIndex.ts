import type {EntityLike} from "./EntityLike.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {Consumer, Predicate} from "../../type/types.ts";

export class GridSpatialIndex<T extends EntityLike> {
    private readonly width: number;
    private readonly height: number;
    private readonly cellSize: number;
    private readonly cols: number;
    private readonly rows: number;
    private readonly grid: Set<T>[][];

    private readonly entityGridCells: Map<T, number[]> = new Map();
    private searchGeneration = 0;

    public constructor(width: number, height: number, cellSize: number = 80) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / this.cellSize);
        this.rows = Math.ceil(height / this.cellSize);

        this.grid = Array(this.rows)
            .fill(null)
            .map(() => Array(this.cols)
                .fill(null)
                .map(() => new Set()));
    }

    private toCoord(value: number, maxIndex: number): number {
        return Math.max(0, Math.min(maxIndex, Math.floor(value / this.cellSize)));
    }

    private getCoveredCells(box: AABB): number[] {
        if (box.maxX < 0 || box.minX > this.width ||
            box.maxY < 0 || box.minY > this.height
        ) return [];

        const startCol = this.toCoord(box.minX, this.cols - 1);
        const endCol = this.toCoord(box.maxX, this.cols - 1);
        const startRow = this.toCoord(box.minY, this.rows - 1);
        const endRow = this.toCoord(box.maxY, this.rows - 1);

        const cells: number[] = [];
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                cells.push(r, c);
            }
        }
        return cells;
    }

    public insert(entity: T): void {
        this.remove(entity);

        const cells = this.getCoveredCells(entity.getBoundingBox());
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
        const startCol = this.toCoord(region.minX, this.cols - 1);
        const endCol = this.toCoord(region.maxX, this.cols - 1);
        const startRow = this.toCoord(region.minY, this.rows - 1);
        const endRow = this.toCoord(region.maxY, this.rows - 1);

        if (startCol === endCol && startRow === endRow) {
            for (const entity of this.grid[startRow][startCol]) {
                if (region.intersectsByBox(entity.getBoundingBox())) {
                    yield entity;
                }
            }
            return;
        }

        const gen = ++this.searchGeneration;
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
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
        this.grid.length = 0;
        this.entityGridCells.clear();
    }
}