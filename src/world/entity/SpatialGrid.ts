import type {EntityLike} from "./EntityLike.ts";
import type {Box} from "../../utils/math/Box.ts";
import {clamp} from "../../utils/math/math.ts";
import type {Predicate} from "../../apis/types.ts";

export class SpatialGrid<T extends EntityLike> {
    private readonly cellLength: number;
    private readonly cellLengthInv: number;

    private readonly cols: number;
    private readonly rows: number;

    private readonly grid: Array<Set<T> | null> = [];
    private readonly entityToCells = new Map<number, Uint32Array>();

    public constructor(totalWidth: number, totalHeight: number, cellLength: number = 64) {
        this.cellLength = cellLength;
        this.cellLengthInv = 1.0 / this.cellLength;

        this.cols = Math.ceil(totalWidth / cellLength);
        this.rows = Math.ceil(totalHeight / cellLength);
        const totalCells = this.cols * this.rows;

        this.grid = new Array(totalCells).fill(null);
    }

    private* getCoveredCells(box: Box): Generator<number> {
        const {minX, minY, maxX, maxY} = box;

        const colStart = Math.floor(minX * this.cellLengthInv);
        const colEnd = Math.floor((maxX - 1e-5) * this.cellLengthInv);
        const rowStart = Math.floor(minY * this.cellLengthInv);
        const rowEnd = Math.floor((maxY - 1e-5) * this.cellLengthInv);

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

    private getCoveredCellsArray(box: Box): Uint32Array {
        const {minX, minY, maxX, maxY} = box;

        const colStart = Math.floor(minX * this.cellLengthInv);
        const colEnd = Math.floor((maxX - 1e-5) * this.cellLengthInv);
        const rowStart = Math.floor(minY * this.cellLengthInv);
        const rowEnd = Math.floor((maxY - 1e-5) * this.cellLengthInv);

        const validColStart = clamp(colStart, 0, this.cols - 1);
        const validColEnd = clamp(colEnd, 0, this.cols - 1);
        const validRowStart = clamp(rowStart, 0, this.rows - 1);
        const validRowEnd = clamp(rowEnd, 0, this.rows - 1);

        const cellCount = (validColEnd - validColStart + 1) * (validRowEnd - validRowStart + 1);
        const result = new Uint32Array(cellCount);

        let index = 0;
        for (let col = validColStart; col <= validColEnd; col++) {
            for (let row = validRowStart; row <= validRowEnd; row++) {
                result[index++] = col + row * this.cols;
            }
        }

        return result;
    }

    public insert(entity: T): void {
        const box = entity.getBoundingBox();
        const cellIndices = this.getCoveredCellsArray(box);
        this.entityToCells.set(entity.getId(), cellIndices);

        for (const idx of cellIndices) {
            const set = this.grid[idx] ?? new Set<T>();
            set.add(entity);
        }
    }

    public remove(entity: T): boolean {
        const id = entity.getId();
        const cellIndices = this.entityToCells.get(id);
        if (!cellIndices) return false;

        for (const idx of cellIndices) {
            const cell = this.grid[idx];
            if (!cell) continue;

            cell.delete(entity);
            if (cell.size === 0) {
                this.grid[idx] = null;
            }
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

        const visited = new Set<number>();
        for (const idx of cellIndices) {
            const cell = this.grid[idx];
            if (!cell) continue;

            for (const entity of cell) {
                const id = entity.getId();
                if (visited.has(id)) continue;

                if (!entity.getBoundingBox().intersectsByBox(queryBox)) continue;

                if (!predicate(entity)) return;
                visited.add(id);
            }
        }
    }

    public clear(): void {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i]?.clear();
        }
        this.entityToCells.clear();
    }
}