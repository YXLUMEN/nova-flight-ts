import type {EntityIndex} from "./EntityIndex.ts";
import type {Consumer, Predicate, UUID} from "../../apis/types.ts";
import type {EntityLike} from "./EntityLike.ts";
import type {Box} from "../../utils/math/Box.ts";
import type {GridSpatialIndex} from "./GridSpatialIndex.ts";

export class EntityLookUp<T extends EntityLike> {
    private readonly index: EntityIndex<T>;
    private readonly grid: GridSpatialIndex<T>;

    public constructor(index: EntityIndex<T>, grid: GridSpatialIndex<T>) {
        this.index = index;
        this.grid = grid;
    }

    public get(id: number) {
        return this.index.get(id);
    }

    public getByUUID(uuid: UUID) {
        return this.index.getByUUID(uuid);
    }

    public iterate(): Iterator<T> {
        return this.index.iterate();
    }

    public query(queryBox: Box): T[] {
        return this.grid.query(queryBox);
    }

    public forEachInBox(box: Box, consumer: Consumer<T>): void {
        this.grid.forEach(box, consumer);
    }

    public findFirst(box: Box, predicate: Predicate<T>): void {
        this.grid.findFirst(box, predicate);
    }

    public getStats() {
        return this.grid.getStatsDetail();
    }
}