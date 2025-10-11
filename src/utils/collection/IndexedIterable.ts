export interface IndexedIterable<T> extends Iterable<T> {
    getRawId(value: T): number;

    get(index: number): T | null;

    getOrThrow(index: number): T;

    getRawOrThrow(value: T): number;

    size(): number;
}