import type {Comparable} from "../../type/Comparable.ts";
import type {Return} from "../../type/types.ts";

export class WrapperMap<K extends Comparable, V> implements Map<K, V> {
    public readonly [Symbol.toStringTag]: string = 'WrapperMap';

    private readonly map: Map<number, Entry<K, V>[]> = new Map();
    private entrySize = 0;

    public set(key: K, value: V): this {
        const hash = key.hashCode();
        const bucket = this.map.get(hash);

        if (!bucket) {
            this.map.set(hash, [{key, value}]);
            this.entrySize++;
            return this;
        }

        for (const entry of bucket) {
            if (entry.key.equals(key)) {
                entry.value = value;
                return this;
            }
        }

        bucket.push({key, value});
        this.entrySize++;
        return this;
    }

    public get(key: K): V | undefined {
        const bucket = this.map.get(key.hashCode());
        if (!bucket) return undefined;

        for (const entry of bucket) {
            if (entry.key.equals(key)) return entry.value;
        }

        return undefined;
    }

    public has(key: K): boolean {
        const bucket = this.map.get(key.hashCode());
        if (!bucket) return false;
        return bucket.some(e => e.key.equals(key));
    }

    public delete(key: K): boolean {
        const hash = key.hashCode();
        const bucket = this.map.get(hash);
        if (!bucket) return false;

        for (let i = 0; i < bucket.length; i++) {
            if (!bucket[i].key.equals(key)) continue;

            bucket.splice(i, 1);
            if (bucket.length === 0) this.map.delete(hash);
            this.entrySize--;
            return true;
        }

        return false;
    }

    public clear(): void {
        this.map.clear();
        this.entrySize = 0;
    }

    public get size(): number {
        return this.entrySize;
    }

    public* entries(): MapIterator<[K, V]> {
        for (const bucket of this.map.values()) {
            for (const e of bucket) yield [e.key, e.value];
        }
    }

    public* keys(): MapIterator<K> {
        for (const [key] of this.entries()) {
            yield key;
        }
    }

    public* values(): MapIterator<V> {
        for (const [, value] of this.entries()) {
            yield value;
        }
    }

    public forEach(callback: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        for (const [key, value] of this.entries()) {
            callback.call(thisArg, value, key, this);
        }
    }

    public [Symbol.iterator](): MapIterator<[K, V]> {
        return this.entries();
    }

    public getOrInsert(key: K, defaultValue: V): V {
        if (this.has(key)) {
            return this.get(key)!;
        }

        this.set(key, defaultValue);
        return defaultValue;
    }

    public getOrInsertComputed(key: K, callback: Return<K, V>): V {
        if (this.has(key)) {
            return this.get(key)!;
        }

        const newValue = callback(key);
        this.set(key, newValue);
        return newValue;
    }
}

interface Entry<K extends Comparable, V> {
    key: K;
    value: V;
}