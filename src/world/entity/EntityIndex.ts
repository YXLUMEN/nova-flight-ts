import type {EntityLike} from "./EntityLike.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {Consumer, Predicate} from "../../type/types.ts";

export interface EntityIndex<T extends EntityLike> {
    insert(entity: T): void;

    remove(entity: T): boolean;

    search(region: AABB): Generator<T, void>;

    forEach(region: AABB, consumer: Consumer<T>): void;

    findFirst(region: AABB, predicate: Predicate<T>): void;

    clear(): void;
}