import type {Comparable} from "../../type/Comparable.ts";
import type {HashSet} from "./HashSet.ts";

export class WrapperSet<T extends Comparable> implements HashSet<T> {
    public readonly [Symbol.toStringTag]: string = 'HashSet';

    private readonly buckets: Map<number, T[]> = new Map();
    private size_: number = 0;

    public constructor(iterable?: Iterable<T> | null) {
        if (!iterable) return;
        for (const item of iterable) this.add(item);
    }

    public add(value: T): this {
        const hash = value.hashCode();
        const bucket = this.buckets.get(hash);

        if (!bucket) {
            this.buckets.set(hash, [value]);
            this.size_++;
            return this;
        }

        const exists = bucket.some(entry => entry.equals(value));
        if (!exists) {
            bucket.push(value);
            this.size_++;
        }
        return this;
    }

    public clear(): void {
        this.buckets.clear();
        this.size_ = 0;
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
        this.size_--;
        return true;
    }

    public forEach(callback: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
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
        return this.size_;
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

    public values(): SetIterator<T> {
        return this.keys();
    }

    public [Symbol.iterator](): SetIterator<T> {
        return this.values();
    }

    public union<U>(other: ReadonlySetLike<U>): Set<T | U> {
        const result = new Set<T | U>(this);
        for (const i of Iterator.from(other.keys())) result.add(i);
        return result;
    }

    public intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
        const result = new Set<T & U>();
        if (this.size_ === 0 || other.size === 0) return result;

        for (const value of this) {
            if (other.has(value as unknown as U)) {
                result.add(value as T & U);
            }
        }
        return result;
    }

    public difference<U>(other: ReadonlySetLike<U>): Set<T> {
        const result = new Set<T>();
        if (this.size_ === 0) return result;

        for (const value of this) {
            if (!other.has(value as unknown as U)) {
                result.add(value);
            }
        }
        return result;
    }

    public symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
        const result = new Set<T | U>();

        for (const value of this) {
            if (!other.has(value as unknown as U)) {
                result.add(value);
            }
        }
        for (const value of Iterator.from(other.keys())) {
            if (!this.includesForeign(value)) {
                result.add(value);
            }
        }
        return result;
    }

    public isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
        if (this.size_ === 0) return true;
        if (this.size_ > other.size) return false;

        for (const value of this) {
            if (!other.has(value)) return false;
        }
        return true;
    }

    public isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
        if (this.size_ < other.size) return false;
        if (other.size === 0) return true;

        for (const value of Iterator.from(other.keys())) {
            if (!this.includesForeign(value)) return false;
        }
        return true;
    }

    public isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
        if (this.size_ === 0 || other.size === 0) return true;

        if (other.size < this.size_) {
            for (const value of Iterator.from(other.keys())) {
                if (this.includesForeign(value)) return false;
            }
            return true;
        }

        for (const value of this) {
            if (other.has(value)) return false;
        }
        return true;
    }

    /**
     * 判断外部值（可能不是 {@link Comparable}）是否属于本集合。
     * 若该值提供 hashCode，则沿用本集合的 hashCode/equals 语义；
     * 否则退化按 SameValueZero 逐项比较，避免直接抛错。
     */
    private includesForeign(value: unknown): boolean {
        if (this.size_ === 0) return false;

        const candidate = value as { hashCode?: unknown } | null | undefined;
        if (typeof candidate?.hashCode === 'function') {
            return this.has(value as T);
        }

        for (const entry of this.keys()) {
            if (entry === value || Object.is(entry, value)) return true;
        }
        return false;
    }
}