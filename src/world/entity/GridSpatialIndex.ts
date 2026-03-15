import type {EntityLike} from "./EntityLike.ts";
import type {Box} from "../../utils/math/Box.ts";
import type {Consumer, Predicate} from "../../apis/types.ts";

type GridCell<T extends EntityLike> = Set<T>;
type Index = { col: number; row: number };

export class GridSpatialIndex<T extends EntityLike> {
    private readonly cellSize: number;
    private readonly cols: number;
    private readonly rows: number;
    private readonly grid: GridCell<T>[][];
    private readonly filter = new Set<T>();

    private entityGridCells = new Map<T, Index[]>();

    public constructor(width: number, height: number, cellSize: number = 80) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / this.cellSize);
        this.rows = Math.ceil(height / this.cellSize);

        this.grid = Array(this.rows)
            .fill(null)
            .map(() => Array(this.cols)
                .fill(null)
                .map(() => new Set()));
    }

    private toGridCoord(value: number, maxIndex: number): number {
        return Math.max(0, Math.min(maxIndex, Math.floor(value / this.cellSize)));
    }

    private getCoveredCells(box: Box): Index[] {
        const startCol = this.toGridCoord(box.minX, this.cols - 1);
        const endCol = this.toGridCoord(box.maxX, this.cols - 1);
        const startRow = this.toGridCoord(box.minY, this.rows - 1);
        const endRow = this.toGridCoord(box.maxY, this.rows - 1);

        const cells: Index[] = [];
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                cells.push({col: c, row: r});
            }
        }
        return cells;
    }

    public insert(entity: T): void {
        this.remove(entity);

        const cells = this.getCoveredCells(entity.getBoundingBox());
        this.entityGridCells.set(entity, cells);

        for (const cell of cells) {
            this.grid[cell.row][cell.col].add(entity);
        }
    }

    public remove(entity: T): boolean {
        const cells = this.entityGridCells.get(entity);
        if (!cells) return false;

        for (const cell of cells) {
            this.grid[cell.row][cell.col].delete(entity);
        }

        this.entityGridCells.delete(entity);
        return true;
    }

    public* search(region: Box) {
        const startCol = this.toGridCoord(region.minX, this.cols - 1);
        const endCol = this.toGridCoord(region.maxX, this.cols - 1);
        const startRow = this.toGridCoord(region.minY, this.rows - 1);
        const endRow = this.toGridCoord(region.maxY, this.rows - 1);

        if (startCol === endCol && startRow === endRow) {
            for (const entity of this.grid[startRow][startCol]) {
                if (region.intersectsByBox(entity.getBoundingBox())) {
                    yield entity;
                }
            }
            return;
        }

        this.filter.clear();
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                for (const entity of this.grid[r][c]) {
                    if (this.filter.has(entity) || !region.intersectsByBox(entity.getBoundingBox())) continue;
                    this.filter.add(entity);
                    yield entity;
                }
            }
        }
    }

    public query(region: Box): T[] {
        return this.search(region).toArray();
    }

    public forEach(region: Box, consumer: Consumer<T>): void {
        for (const entity of this.search(region)) {
            consumer(entity);
        }
    }

    public findFirst(region: Box, predicate: Predicate<T>): void {
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

    public getStats() {
        let totalEntities = 0;
        let occupiedCells = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const count = this.grid[r][c].size;
                if (count > 0) occupiedCells++;
                totalEntities += count;
            }
        }
        return {
            totalEntities,
            occupiedCells,
            totalCells: this.rows * this.cols,
            avgEntitiesPerCell: totalEntities / (this.rows * this.cols),
        };
    }

    public getStatsDetail() {
        let totalEntities = 0;
        let occupiedCells = 0;
        let maxEntitiesInCell = 0;
        let cellsWithOneEntity = 0;
        let cellsWithManyEntities = 0; // >= 20
        const entityCellCounts: number[] = []; // 每个非空 cell 的实体数（用于分布分析）

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const count = this.grid[r][c].size;
                if (count > 0) {
                    occupiedCells++;
                    entityCellCounts.push(count);
                    if (count === 1) cellsWithOneEntity++;
                    if (count >= 20) cellsWithManyEntities++;
                    if (count > maxEntitiesInCell) maxEntitiesInCell = count;
                }
                totalEntities += count;
            }
        }

        const totalCells = this.rows * this.cols;
        const avgEntitiesPerCellGlobal = totalEntities / totalCells;
        const avgEntitiesPerOccupiedCell = occupiedCells > 0 ? totalEntities / occupiedCells : 0;

        const sortedCounts = [...entityCellCounts].sort((a, b) => a - b);
        const p50Index = Math.floor(sortedCounts.length * 0.5);
        const p90Index = Math.floor(sortedCounts.length * 0.9);
        const medianLoad = sortedCounts[p50Index] ?? 0;
        const p90Load = sortedCounts[p90Index] ?? 0;

        return {
            totalEntities,
            totalCells,
            occupiedCells,

            utilization: occupiedCells / totalCells, // 网格利用率 [0~1]
            avgEntitiesPerCellGlobal,               // 全局平均
            avgEntitiesPerOccupiedCell,             // 非空 cell 平均负载

            medianLoad,                             // 50% 的非空 cell ≤ 此值
            p90Load,                                // 90% 的非空 cell ≤ 此值
            maxEntitiesInCell,                      // 最差情况
            cellsWithOneEntity,                     // 理想单元（无冗余）
            cellsWithManyEntities,                  // 警戒：可能退化
        };
    }
}