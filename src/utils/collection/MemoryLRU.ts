import type {Consumer, Pair, Return} from "../../type/types.ts";

export class MemoryLRU<K, V> {
    private readonly cacheMap = new Map<K, V>();

    private readonly capacity: number;
    private readonly onRemove: Consumer<Pair<K, V | null>> | null;

    public constructor(capacity: number, onRemove?: Consumer<Pair<K, V | null>>) {
        this.capacity = Math.max(1, Math.floor(capacity));
        this.onRemove = onRemove ?? null;
    }

    public get(key: K): V | null {
        const value = this.cacheMap.get(key);
        if (value === undefined) return null;

        this.cacheMap.delete(key);
        this.cacheMap.set(key, value);
        return value;
    }

    public set(key: K, value: V): void {
        if (this.cacheMap.has(key)) this.cacheMap.delete(key);
        this.cacheMap.set(key, value);

        if (this.cacheMap.size <= this.capacity) return;

        const oldest = this.cacheMap.keys().next().value;
        if (oldest === undefined) return;

        const ov = this.cacheMap.get(oldest);
        this.cacheMap.delete(oldest);
        this.notify(oldest, ov);
    }

    public has(key: K): boolean {
        return this.cacheMap.has(key);
    }

    public delete(key: K): boolean {
        if (!this.cacheMap.has(key)) return false;

        const value = this.cacheMap.get(key)!;
        this.cacheMap.delete(key);
        this.notify(key, value);
        return true;
    }

    public clear(): void {
        if (this.notify) {
            for (const [k, v] of this.cacheMap) this.notify(k, v);
        }
        this.cacheMap.clear();
    }

    public getOrInsertComputed(key: K, callback: Return<K, V>): V {
        if (this.has(key)) {
            return this.get(key)!;
        }

        const newValue = callback(key);
        this.set(key, newValue);
        return newValue;
    }

    public size() {
        return this.cacheMap.size;
    }

    public stableValues(): V[] {
        return Array.from(this.cacheMap.values());
    }

    public values() {
        return this.cacheMap.values();
    }

    private notify(k: K, v: V | null = null): void {
        try {
            this.onRemove?.({key: k, value: v});
        } catch {
        }
    }
}