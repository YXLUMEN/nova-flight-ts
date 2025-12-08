import type {Comparable} from "../../apis/types.ts";

export class HashSet<T extends Comparable> {
    public readonly [Symbol.toStringTag]: string = 'HashSet';
    private readonly buckets: Map<string, T[]> = new Map();
    private _size: number = 0;

    public add(value: T): this {
        const hash = value.hashCode();
        const bucket = this.buckets.get(hash);

        if (!bucket) {
            this.buckets.set(hash, [value]);
            this._size++;
            return this;
        }

        const exists = bucket.some(entry => entry.equals(value));
        if (!exists) {
            bucket.push(value);
            this._size++;
        }
        return this;
    }

    public clear(): void {
        this.buckets.clear();
        this._size = 0;
    }

    public delete(value: T): boolean {
        const key = value.hashCode();
        const bucket = this.buckets.get(key);
        if (!bucket) return false;

        const index = bucket.findIndex(existing => existing.equals(value));
        if (index === -1) return false;

        bucket.splice(index, 1);
        if (bucket.length === 0) {
            this.buckets.delete(key);
        }
        this._size--;
        return true;
    }

    public forEach(callback: (value: T, value2: T, set: HashSet<T>) => void, thisArg?: any): void {
        for (const value of this.values()) {
            callback.call(thisArg, value, value, this);
        }
    }

    public has(value: T): boolean {
        const key = value.hashCode();
        const bucket = this.buckets.get(key);
        if (!bucket) return false;

        return bucket.some(existing => existing.equals(value));
    }

    public get size(): number {
        return this._size;
    };

    public* entries(): SetIterator<[T, T]> {
        for (const bucket of this.buckets.values()) {
            for (const value of bucket) {
                yield [value, value];
            }
        }
    }

    public* keys(): SetIterator<T> {
        for (const bucket of this.buckets.values()) {
            for (const value of bucket) {
                yield value;
            }
        }
    }

    public* values(): SetIterator<T> {
        yield* this.keys();
    }

    public [Symbol.iterator](): SetIterator<T> {
        return this.values();
    }
}