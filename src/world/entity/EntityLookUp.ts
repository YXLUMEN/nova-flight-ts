import type {EntityIndex} from "./EntityIndex.ts";
import type {SpatialGrid} from "./SpatialGrid.ts";
import type {Predicate, UUID} from "../../apis/types.ts";
import type {EntityLike} from "./EntityLike.ts";
import type {Box} from "../../utils/math/Box.ts";

export class EntityLookUp<T extends EntityLike> {
    private readonly index: EntityIndex<T>;
    private readonly grid: SpatialGrid<T>;

    public constructor(index: EntityIndex<T>, grid: SpatialGrid<T>) {
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

    public query(queryBox: Box): Set<T> {
        return this.grid.query(queryBox);
    }

    public forEachInBox(queryBox: Box, predicate: Predicate<T>): void {
        this.grid.forEachInBox(queryBox, predicate);
    }
}