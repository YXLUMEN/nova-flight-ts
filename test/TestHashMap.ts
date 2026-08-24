import type {Comparable} from "../src/type/Comparable";
import type {Pair, Return} from "../src/type/types";

export class HashMap<K extends Comparable, V> implements Map<K, V> {
    public readonly [Symbol.toStringTag]: string = 'HashMap';

    private readonly loadFactor = 0.8;
    private readonly initCapacity: number;

    private buckets: Array<BucketEntry<K, V>[] | null>;
    private entrySize = 0;

    public constructor(capacity = 16) {
        capacity = 1 << Math.ceil(Math.log2(Math.max(capacity, 1)));
        this.buckets = new Array(capacity).fill(null);
        this.initCapacity = capacity;
    }

    public set(key: K, value: V): this {
        if (this.entrySize / this.buckets.length >= this.loadFactor) {
            this.resize();
        }

        const hash = key.hashCode();
        const idx = hash & (this.buckets.length - 1);
        let bucket = this.buckets[idx];

        if (!bucket) {
            this.buckets[idx] = bucket = [];
        }

        for (const entry of bucket) {
            if (entry.hash === hash && entry.key.equals(key)) {
                entry.value = value;
                return this;
            }
        }

        bucket.push({key, value, hash});
        this.entrySize++;
        return this;
    }

    public get(key: K): V | undefined {
        const hash = key.hashCode();
        const bucket = this.buckets[hash & (this.buckets.length - 1)];

        if (!bucket) return undefined;

        for (const entry of bucket) {
            if (entry.hash === hash && entry.key.equals(key)) {
                return entry.value;
            }
        }
        return undefined;
    }

    public has(key: K): boolean {
        return this.get(key) !== undefined;
    }

    public delete(key: K): boolean {
        const hash = key.hashCode();
        const idx = hash & (this.buckets.length - 1);
        const bucket = this.buckets[idx];

        if (!bucket) return false;

        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].hash === hash && bucket[i].key.equals(key)) {
                bucket.splice(i, 1);
                if (bucket.length === 0) this.buckets[idx] = null;

                this.entrySize--;
                return true;
            }
        }
        return false;
    }

    public clear(): void {
        this.buckets = new Array(this.initCapacity).fill(null);
        this.entrySize = 0;
    }

    public get size(): number {
        return this.entrySize;
    }

    public* entries(): MapIterator<[K, V]> {
        for (const bucket of this.buckets) {
            if (!bucket) continue;
            for (const {key, value} of bucket) {
                yield [key, value];
            }
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
        const value = this.get(key);
        if (value !== undefined) return value;

        this.set(key, defaultValue);
        return defaultValue;
    }

    public getOrInsertComputed(key: K, callback: Return<K, V>): V {
        const value = this.get(key);
        if (value !== undefined) return value;

        const newValue = callback(key);
        this.set(key, newValue);
        return newValue;
    }

    private resize(): void {
        const old = this.buckets;
        const newLen = old.length * 2;
        this.buckets = new Array(newLen).fill(null);

        for (const bucket of old) {
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const {key, value, hash} = bucket[i];
                const idx = hash & (newLen - 1);
                (this.buckets[idx] ??= []).push({key, value, hash});
            }
        }
    }
}

export class WrapperMap<K extends Comparable, V> {
    [Symbol.toStringTag] = 'WrapperMap';
    private map = new Map<number, Array<Pair<K, V>>>();
    private size_ = 0;

    get size(): number {
        return this.size_;
    }

    set(key: K, value: V): this {
        const hash = key.hashCode();
        let bucket = this.map.get(hash);
        if (!bucket) {
            this.map.set(hash, [{key, value}]);
            this.size_++;
            return this;
        }
        for (const entry of bucket) {
            if (entry.key.equals(key)) {
                entry.value = value;
                return this;
            }
        }
        bucket.push({key, value});
        this.size_++;
        return this;
    }

    get(key: K): V | undefined {
        const bucket = this.map.get(key.hashCode());
        if (!bucket) return undefined;
        for (const entry of bucket) {
            if (entry.key.equals(key)) return entry.value;
        }
        return undefined;
    }

    has(key: K): boolean {
        const bucket = this.map.get(key.hashCode());
        if (!bucket) return false;
        return bucket.some(e => e.key.equals(key));
    }

    delete(key: K): boolean {
        const hash = key.hashCode();
        const bucket = this.map.get(hash);
        if (!bucket) return false;
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].key.equals(key)) {
                bucket.splice(i, 1);
                if (bucket.length === 0) this.map.delete(hash);
                this.size_--;
                return true;
            }
        }
        return false;
    }

    clear(): void {
        this.map.clear();
        this.size_ = 0;
    }

    * entries(): IterableIterator<[K, V]> {
        for (const bucket of this.map.values()) {
            for (const e of bucket) yield [e.key, e.value];
        }
    }

    * keys(): IterableIterator<K> {
        for (const [k] of this.entries()) yield k;
    }

    * values(): IterableIterator<V> {
        for (const [, v] of this.entries()) yield v;
    }

    forEach(cb: (v: V, k: K, m: Map<K, V>) => void, thisArg?: any): void {
        for (const [k, v] of this.entries()) cb.call(thisArg, v, k, this);
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }
}

interface BucketEntry<K extends Comparable, V> {
    key: K;
    value: V;
    hash: number;
}

class TestKey implements Comparable {
    public readonly id: number;
    private readonly hashSeed: number;

    constructor(id: number, hashSeed: number = 0) {
        this.id = id;
        this.hashSeed = hashSeed;
    }

    hashCode(): number {
        // 简单模拟：若 hashSeed 为 0 则用 id 本身（无冲突），否则强碰撞
        return this.hashSeed === 0 ? this.id : this.hashSeed;
    }

    equals(other: TestKey): boolean {
        return this.id === other.id;
    }
}

interface TestResult {
    name: string;
    ops: number;
    totalTimeMs: number;
    avgTimeMs: number;
}

function runTest(
    name: string,
    mapFactory: () => Map<TestKey, number>,
    keyCount: number,
    operations: number // 总操作数
): TestResult {
    const map = mapFactory();
    const keys: TestKey[] = [];
    // 预生成 keys，使用不同的哈希分布模式
    // 此处我们使用两种模式：无冲突（hash = id）和强冲突（hash = 1）
    // 测试会分别调用，所以用参数控制
    for (let i = 0; i < keyCount; i++) {
        keys.push(new TestKey(i, i % 4 === 0 ? 1 : i)); // 制造 10% 碰撞
    }

    // 预填充一半数据
    const half = Math.floor(keyCount / 2);
    for (let i = 0; i < half; i++) {
        map.set(keys[i], i);
    }

    const start = performance.now();
    let opCount = 0;
    const rand = (max: number) => Math.floor(Math.random() * max);

    while (opCount < operations) {
        const op = Math.random();
        const idx = rand(keyCount);
        const key = keys[idx];
        if (op < 0.4) { // 40% get
            map.get(key);
        } else if (op < 0.7) { // 30% set
            map.set(key, idx);
        } else if (op < 0.9) { // 20% delete
            map.delete(key);
        } else { // 10% iteration (full)
            for (const _ of map.entries()) { /* just iterate */
            }
        }
        opCount++;
    }

    const end = performance.now();
    const totalMs = end - start;
    return {
        name,
        ops: operations,
        totalTimeMs: totalMs,
        avgTimeMs: totalMs / operations,
    };
}

// ========== 主测试流程 ==========
function benchmark() {
    const sizes = [1000, 10000, 50000];
    const operationsPerTest = 10000; // 每个测试运行1万次操作
    const iterations = 5; // 每个配置运行5次取平均

    const results: TestResult[] = [];

    for (const size of sizes) {
        console.log(`\n=== Testing with ${size} keys ===`);

        for (let iter = 0; iter < iterations; iter++) {
            // 测试 HashMap
            const r1 = runTest(
                `HashMap (size=${size})`,
                () => new HashMap<TestKey, number>(),
                size,
                operationsPerTest
            );
            results.push(r1);

            // 测试 WrapperMap
            const r2 = runTest(
                `WrapperMap (size=${size})`,
                // @ts-ignore
                () => new WrapperMap<TestKey, number>(),
                size,
                operationsPerTest
            );
            results.push(r2);
        }
    }

    // 聚合结果：按 name 分组计算平均
    const aggregated = new Map<string, { totalTime: number; count: number }>();
    for (const r of results) {
        const key = r.name;
        const cur = aggregated.get(key);
        if (cur) {
            cur.totalTime += r.totalTimeMs;
            cur.count += 1;
        } else {
            aggregated.set(key, {totalTime: r.totalTimeMs, count: 1});
        }
    }

    console.log('\n========== FINAL AVERAGE RESULTS ==========');
    for (const [name, data] of aggregated) {
        const avg = data.totalTime / data.count;
        console.log(`${name}: avg ${avg.toFixed(2)} ms for ${operationsPerTest} ops`);
    }
}

// 运行
benchmark();