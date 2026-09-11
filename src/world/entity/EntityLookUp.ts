import type {EntityMap} from "./EntityMap.ts";
import type {Consumer, Predicate, UUID} from "../../type/types.ts";
import type {EntityLike} from "./EntityLike.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {EntityIndex} from "./EntityIndex.ts";

export class EntityLookUp<T extends EntityLike> {
    private readonly map: EntityMap<T>;
    private readonly index: EntityIndex<T>;

    public constructor(index: EntityMap<T>, grid: EntityIndex<T>) {
        this.map = index;
        this.index = grid;
    }

    public get(id: number): T | null {
        return this.map.get(id);
    }

    public getByUUID(uuid: UUID): T | null {
        return this.map.getByUUID(uuid);
    }

    public iterate(): Iterator<T> {
        return this.map.iterate();
    }

    public search(box: AABB): Generator<T, void> {
        return this.index.search(box);
    }

    public forEachInBox(box: AABB, consumer: Consumer<T>): void {
        this.index.forEach(box, consumer);
    }

    public findFirst(box: AABB, predicate: Predicate<T>): void {
        this.index.findFirst(box, predicate);
    }
}