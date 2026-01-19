import type {EntityLike} from "./EntityLike.ts";
import type {Box} from "../../utils/math/Box.ts";
import {clamp} from "../../utils/math/math.ts";
import type {Predicate} from "../../apis/types.ts";

export class SpatialGrid<T extends EntityLike> {
    private readonly cellLength: number;

    private readonly cols: number;
    private readonly rows: number;

    private readonly grid: Array<Set<T> | null> = [];
    private readonly entityToCells = new Map<number, number[]>();

    public constructor(totalWidth: number, totalHeight: number, cellLength: number = 64) {
        this.cellLength = cellLength;

        this.cols = Math.ceil(totalWidth / cellLength);
        this.rows = Math.ceil(totalHeight / cellLength);

        const totalCells = this.cols * this.rows;
        for (let i = 0; i < totalCells; i++) {
            this.grid[i] = new Set<T>();
        }
    }

    private *getCoveredCells(box: Box): Generator<number> {
        const {minX, minY, maxX, maxY} = box;

        // 计算覆盖的列/行范围（避免浮点精度问题）
        const colStart = Math.floor(minX / this.cellLength);
        const colEnd = Math.floor((maxX - 1e-5) / this.cellLength);
        const rowStart = Math.floor(minY / this.cellLength);
        const rowEnd = Math.floor((maxY - 1e-5) / this.cellLength);

        const validColStart = clamp(colStart, 0, this.cols - 1);
        const validColEnd = clamp(colEnd, 0, this.cols - 1);
        const validRowStart = clamp(rowStart, 0, this.rows - 1);
        const validRowEnd = clamp(rowEnd, 0, this.rows - 1);

        for (let col = validColStart; col <= validColEnd; col++) {
            for (let row = validRowStart; row <= validRowEnd; row++) {
                yield col + row * this.cols;
            }
        }
    }

    public insert(entity: T): void {
        const box = entity.getBoundingBox();
        const cellIndices = this.getCoveredCells(box).toArray();
        this.entityToCells.set(entity.getId(), cellIndices);

        for (const idx of cellIndices) {
            this.grid[idx]!.add(entity);
        }
    }

    public remove(entity: T): boolean {
        const id = entity.getId();
        const cellIndices = this.entityToCells.get(id);
        if (!cellIndices) return false;

        for (const idx of cellIndices) {
            this.grid[idx]!.delete(entity);
        }

        this.entityToCells.delete(id);
        return true;
    }

    public query(queryBox: Box): Set<T> {
        const cellIndices = this.getCoveredCells(queryBox);

        const results = new Set<T>();
        for (const idx of cellIndices) {
            const cell = this.grid[idx];
            if (!cell) continue;

            for (const entity of cell) {
                if (!entity.getBoundingBox().intersectsByBox(queryBox)) continue;
                results.add(entity);
            }
        }
        return results;
    }

    public forEachInBox(queryBox: Box, predicate: Predicate<T>): void {
        const cellIndices = this.getCoveredCells(queryBox);

        const results = new Set<T>();
        for (const idx of cellIndices) {
            const cell = this.grid[idx];
            if (!cell) continue;

            for (const entity of cell) {
                if (!entity.getBoundingBox().intersectsByBox(queryBox) || results.has(entity)) continue;
                if (!predicate(entity)) return;
                results.add(entity);
            }
        }
    }

    public clear(): void {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i]!.clear();
        }
        this.entityToCells.clear();
    }
}