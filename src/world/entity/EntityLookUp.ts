import type {EntityIndex} from "./EntityIndex.ts";
import type {Consumer, Predicate, UUID} from "../../type/types.ts";
import type {EntityLike} from "./EntityLike.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {GridSpatialIndex} from "./GridSpatialIndex.ts";

export class EntityLookUp<T extends EntityLike> {
    private readonly index: EntityIndex<T>;
    private readonly grid: GridSpatialIndex<T>;

    public constructor(index: EntityIndex<T>, grid: GridSpatialIndex<T>) {
        this.index = index;
        this.grid = grid;
    }

    public get(id: number): T | null {
        return this.index.get(id);
    }

    public getByUUID(uuid: UUID): T | null {
        return this.index.getByUUID(uuid);
    }

    public iterate(): Iterator<T> {
        return this.index.iterate();
    }

    public search(box: AABB): Generator<T, void> {
        return this.grid.search(box);
    }

    public forEachInBox(box: AABB, consumer: Consumer<T>): void {
        this.grid.forEach(box, consumer);
    }

    public findFirst(box: AABB, predicate: Predicate<T>): void {
        this.grid.findFirst(box, predicate);
    }
}