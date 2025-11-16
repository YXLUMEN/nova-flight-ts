export class MemoryLRU<K, V> {
    private cacheMap = new Map<K, V>();

    private readonly capacity: number;

    public constructor(capacity: number) {
        this.capacity = Math.max(1, capacity | 0);
    }

    public get(k: K): V | null {
        if (!this.cacheMap.has(k)) return null;
        const v = this.cacheMap.get(k)!;
        this.cacheMap.delete(k);
        this.cacheMap.set(k, v);
        return v;
    }

    public set(k: K, v: V): void {
        if (this.cacheMap.has(k)) this.cacheMap.delete(k);
        this.cacheMap.set(k, v);
        if (this.cacheMap.size > this.capacity) {
            const oldest = this.cacheMap.keys().next().value;
            if (oldest === undefined) return;
            this.cacheMap.delete(oldest);
        }
    }

    public delete(k: K): boolean {
        if (!this.cacheMap.has(k)) return false;
        this.cacheMap.delete(k);
        return true;
    }

    public clear(): void {
        this.cacheMap.clear();
    }

    public size() {
        return this.cacheMap.size;
    }

    public stableValues(): V[] {
        return Array.from(this.cacheMap.values());
    }
}