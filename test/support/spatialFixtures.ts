/**
 * PackedSpatialIndex / SetPool 的测试与基准共用夹具。
 *
 * 这里只放"与断言框架无关"的东西（假实体、确定性随机、暴力参照、内部结构探针），
 * 测试文件用 `node:test` 的 describe/it 组织，基准文件直接调用同一套夹具，
 * 保证两边跑的是同一份负载与同一份参照实现。
 *
 * 命名空间注意（踩过两次的坑）：
 *   `entity.searchGen` 是索引私有的去重命名空间，两个索引实例共享同一批实体对象时
 *   会互相污染（A 索引搜完，B 索引会认为"本代已产出"而漏掉实体）。
 *   对拍时必须给每个索引各自创建一批实体，或每轮重置 searchGen。
 */

import type {UUID} from "../../src/type/types.ts";
import {AABB} from "../../src/utils/math/AABB.ts";
import type {EntityLike} from "../../src/world/entity/EntityLike.ts";
import type {EntityIndex} from "../../src/world/entity/EntityIndex.ts";

// ---------------------------------------------------------------------------
// 1. 运行时补齐
// ---------------------------------------------------------------------------

/**
 * Node 22 的 Map 没有 `getOrInsertComputed`（V8 13.7 / Chrome 138 才有），
 * 而 PackedSpatialIndex.insert 依赖它。幂等，浏览器里是空操作。
 */
export function installRuntimePolyfills(): void {
    const proto = Map.prototype as typeof Map.prototype & {
        getOrInsertComputed?: <K, V>(this: Map<K, V>, key: K, fn: (key: K) => V) => V;
    };
    if (typeof proto.getOrInsertComputed === "function") return;

    proto.getOrInsertComputed = function <K, V>(this: Map<K, V>, key: K, fn: (key: K) => V): V {
        let value = this.get(key);
        if (value === undefined) {
            value = fn(key);
            this.set(key, value);
        }
        return value;
    };
}

// ---------------------------------------------------------------------------
// 2. 确定性随机（xorshift32，同种子同序列，跨平台可复现）
// ---------------------------------------------------------------------------

export class Rng {
    private state: number;

    public constructor(seed: number = 0x9e3779b9) {
        this.state = (seed >>> 0) || 0x9e3779b9;
    }

    /** [0, 1) */
    public next(): number {
        let x = this.state;
        x ^= x << 13;
        x >>>= 0;
        x ^= x >>> 17;
        x ^= x << 5;
        x >>>= 0;
        this.state = x || 0x9e3779b9;
        return x / 0x100000000;
    }

    /** [min, max) */
    public range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    /** [0, maxExclusive) 整数 */
    public int(maxExclusive: number): number {
        return Math.floor(this.next() * maxExclusive);
    }

    /** [min, max] 闭区间整数 */
    public intBetween(min: number, max: number): number {
        return min + this.int(max - min + 1);
    }

    public pick<T>(items: readonly T[]): T {
        return items[this.int(items.length)];
    }
}

// ---------------------------------------------------------------------------
// 3. 假实体
// ---------------------------------------------------------------------------

export class TestEntity implements EntityLike {
    public searchGen = 0;

    /** getBoundingBox() 被调用次数（= 索引扫描到的候选实体数，用于测扫描放大） */
    public boxCalls = 0;

    public readonly id: number;
    private readonly uuid: UUID;
    private boxValue: AABB;

    public constructor(id: number, centerX: number, centerY: number, halfW: number = 8, halfH: number = halfW) {
        this.id = id;
        this.uuid = `00000000-0000-0000-0000-${String(id).padStart(12, "0")}` as UUID;
        this.boxValue = new AABB(centerX - halfW, centerY - halfH, centerX + halfW, centerY + halfH);
    }

    /** 不进索引，只读当前盒（避免污染 boxCalls 统计） */
    public get box(): AABB {
        return this.boxValue;
    }

    public getId(): number {
        return this.id;
    }

    public getUUID(): UUID {
        return this.uuid;
    }

    public getBoundingBox(): AABB {
        this.boxCalls++;
        return this.boxValue;
    }

    public shouldSave(): boolean {
        return true;
    }

    public isPlayer(): boolean {
        return false;
    }

    public moveTo(centerX: number, centerY: number): void {
        const halfW = this.boxValue.getWidth() / 2;
        const halfH = this.boxValue.getHeight() / 2;
        this.boxValue = new AABB(centerX - halfW, centerY - halfH, centerX + halfW, centerY + halfH);
    }

    public setBox(minX: number, minY: number, maxX: number, maxY: number): void {
        this.boxValue = new AABB(minX, minY, maxX, maxY);
    }
}

/** 造一批实体：多数是小盒（1 格内），少数跨多格 */
export function makeEntities(rng: Rng, count: number, span: number, bigRatio: number = 0.1, halfSize: number = 8): TestEntity[] {
    return makeEntitiesInRect(rng, count, -span, -span, span, span, bigRatio, halfSize);
}

/** 在给定矩形内均匀撒点（真实地图用这个：实体只出现在世界范围内） */
export function makeEntitiesInRect(
    rng: Rng,
    count: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    bigRatio: number = 0.1,
    halfSize: number = 8,
): TestEntity[] {
    const list: TestEntity[] = [];
    for (let i = 0; i < count; i++) {
        const big = rng.next() < bigRatio;
        const half = big ? rng.range(40, 200) : halfSize;
        list.push(new TestEntity(i, rng.range(minX, maxX), rng.range(minY, maxY), half, half));
    }
    return list;
}

// ---------------------------------------------------------------------------
// 4. 参照实现（暴力 O(n) 扫描）
// ---------------------------------------------------------------------------

export function bruteForce<T extends EntityLike>(entities: Iterable<T>, region: AABB): T[] {
    const out: T[] = [];
    for (const entity of entities) {
        if (region.intersectsByBox(entity.getBoundingBox())) out.push(entity);
    }
    return out;
}

export function collect<T>(iterable: Iterable<T>): T[] {
    const out: T[] = [];
    for (const item of iterable) out.push(item);
    return out;
}

export function sortedIds(entities: Iterable<EntityLike>): number[] {
    return collect(entities).map(e => e.getId()).sort((a, b) => a - b);
}

/** 与暴力实现按 id 集合比对，不一致时抛出带上下文的错误 */
export function assertSameAsBruteForce(
    label: string,
    index: { search(region: AABB): Generator<EntityLike, void> },
    entities: EntityLike[],
    region: AABB,
): void {
    const got = sortedIds(index.search(region));
    const expect = sortedIds(bruteForce(entities, region));
    if (got.join(",") !== expect.join(",")) {
        throw new Error(`${label}: 索引结果与暴力实现不一致\n  索引 = [${got.join(",")}]\n  暴力 = [${expect.join(",")}]`);
    }
}

// ---------------------------------------------------------------------------
// 5. 内部结构探针（测试专用：穿透 private 读取实现细节）
// ---------------------------------------------------------------------------

export interface PoolInternals<E> {
    idle: Set<E>[];
    outstanding: number;
    peak: number;
    target: number;
    hits: number;
    misses: number;
    dropped: number;
    minIdle: number;
    maxIdle: number;
    keepSizeLimit: number;
    adjustInterval: number;

    drain(): void;
}

export interface IndexInternals<T extends EntityLike> {
    buckets: Map<number, Set<T>>;
    entityCells: Map<T, number[]>;
    pool: PoolInternals<T>;
    searchGeneration: number;
    cellSize: number;
    half: number;
    stride: number;
}

/** 读索引私有字段。TS 的 private 只是编译期约束，运行时就是普通属性。 */
export function internals<T extends EntityLike>(index: EntityIndex<T>): IndexInternals<T> {
    return index as unknown as IndexInternals<T>;
}

export function poolInternals<E>(pool: object): PoolInternals<E> {
    return pool as unknown as PoolInternals<E>;
}

// ---------------------------------------------------------------------------
// 6. 不变量检查
// ---------------------------------------------------------------------------

/** 活跃桶里不允许出现空 Set（池化后最容易漏的点：桶空了却没从 Map 摘掉） */
export function assertNoEmptyBuckets<T extends EntityLike>(index: EntityIndex<T>): void {
    for (const [key, bucket] of internals(index).buckets) {
        if (bucket.size === 0) throw new Error(`不变量破坏: 活跃桶为空, key=${key}`);
    }
}

/**
 * 池化安全的核心不变量：
 *   1. 活跃桶两两不共享同一个 Set 实例；
 *   2. 活跃桶与池中闲置 Set 不重叠（否则会出现"桶被清空后又被别人取走写入"的串写）；
 *   3. 池中每个闲置 Set 都必须是空的。
 */
export function assertPoolAliasingSafe<T extends EntityLike>(index: EntityIndex<T>): void {
    const {buckets, pool} = internals(index);

    const live = new Set<Set<T>>();
    for (const [key, bucket] of buckets) {
        if (live.has(bucket)) throw new Error(`不变量破坏: 两个格子共享同一个 Set 实例, key=${key}`);
        live.add(bucket);
    }

    for (const idleSet of pool.idle) {
        if (live.has(idleSet)) throw new Error("不变量破坏: 活跃桶与池中闲置 Set 是同一个对象（存在串写风险）");
        if (idleSet.size !== 0) throw new Error(`不变量破坏: 池中闲置 Set 不为空, size=${idleSet.size}`);
    }
}

/** 每个实体的 entityCells 记录必须与 buckets 双向一致 */
export function assertEntityCellsConsistent<T extends EntityLike>(index: EntityIndex<T>): void {
    const {buckets, entityCells} = internals(index);

    for (const [entity, keys] of entityCells) {
        for (const key of keys) {
            const bucket = buckets.get(key);
            if (!bucket) throw new Error(`不变量破坏: entityCells 记录了不存在的格子, key=${key}`);
            if (!bucket.has(entity)) throw new Error(`不变量破坏: 桶里没有该实体, key=${key}`);
        }
    }

    for (const [key, bucket] of buckets) {
        for (const entity of bucket) {
            const keys = entityCells.get(entity);
            if (!keys || !keys.includes(key)) throw new Error(`不变量破坏: 桶里有实体但 entityCells 未记录, key=${key}`);
        }
    }
}
