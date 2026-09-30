/**
 * PackedSpatialIndex 语义测试
 *
 * 运行：
 *   node --experimental-transform-types --disable-warning=ExperimentalWarning \
 *        --test test/PackedSpatialIndex.test.ts test/SetPool.test.ts
 *   （必须显式列文件：render_cache/cache.test.ts 也匹配 *.test.ts，但它依赖 ImageBitmap，在 Node 下会崩）
 *
 * 覆盖：
 *   构造与参数校验 / 插入移除 / 查询语义（含边界与去重）/ 世界范围钳置 /
 *   池化后的内部不变量（桶与池不得串写）/ clear 语义 / 随机对拍暴力实现 /
 *   与 GridSpatialIndex 交叉对拍 / 与 SetPool 的接线。
 *
 * 注：`--experimental-transform-types` 是必需的，因为 AABB 的依赖图里有 enum
 * （Node 的 strip-only 模式不支持 enum）。若哪天 AABB 的图不再有 enum，
 * 换成 --experimental-strip-types 会更快。
 */

import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {PackedSpatialIndex} from "../src/world/entity/PackedSpatialIndex.ts";
import {GridSpatialIndex} from "../src/world/entity/GridSpatialIndex.ts";
import {AABB} from "../src/utils/math/AABB.ts";
import {SetPool} from "../src/utils/collection/SetPool.ts";
import {
    assertEntityCellsConsistent,
    assertNoEmptyBuckets,
    assertPoolAliasingSafe,
    assertSameAsBruteForce,
    collect,
    installRuntimePolyfills,
    internals,
    makeEntities,
    makeEntitiesInRect,
    Rng,
    sortedIds,
    TestEntity,
} from "./support/spatialFixtures.ts";

installRuntimePolyfills();

// 盒 ±8、cellSize 80 时会跨格（floor(-8/80) = -1）；
// 想让实体只占一格就用中心 (20,20) 这种"格内远离 0 点"的位置。
const ONE_CELL_CENTER = 20;

// ---------------------------------------------------------------------------
// 构造与参数校验
// ---------------------------------------------------------------------------

describe("构造与参数校验", () => {
    it("非法 cellSize 抛 RangeError", () => {
        for (const bad of [0, -1, -0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            assert.throws(() => new PackedSpatialIndex(bad, 8), RangeError, `cellSize=${bad} 应抛 RangeError`);
        }
    });

    it("非法 half 抛 RangeError", () => {
        for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 31]) {
            assert.throws(() => new PackedSpatialIndex(80, bad), RangeError, `half=${bad} 应抛 RangeError`);
        }
    });

    it("边界合法参数不抛", () => {
        assert.doesNotThrow(() => new PackedSpatialIndex(1, 1));
        assert.doesNotThrow(() => new PackedSpatialIndex(Number.MIN_VALUE, 1));
        assert.doesNotThrow(() => new PackedSpatialIndex(1e9, 47_453_132)); // MAX_HALF
        assert.doesNotThrow(() => new PackedSpatialIndex());
    });

    it("half = MAX_HALF 时格子 key 仍是安全整数（不越出 2^53 精确范围）", () => {
        const half = 47_453_132;
        const index = new PackedSpatialIndex<TestEntity>(1, half);

        const minEdge = new TestEntity(1, -half, -half, 0.5, 0.5);
        const maxEdge = new TestEntity(2, half, half, 0.5, 0.5);
        index.insert(minEdge);
        index.insert(maxEdge);

        for (const entity of [minEdge, maxEdge]) {
            const keys = internals(index).entityCells.get(entity)!;
            assert.ok(keys.length > 0, "实体应至少覆盖一格");
            for (const key of keys) {
                assert.ok(Number.isSafeInteger(key), `key=${key} 必须是安全整数`);
                assert.ok(key >= 0 && key <= 4 * half * (half + 1), `key=${key} 越界`);
            }
        }

        // 两端实体互不串位，且各自能被查到
        assert.equal(collect(index.search(minEdge.box)).length, 1);
        assert.equal(collect(index.search(maxEdge.box)).length, 1);
    });
});

// ---------------------------------------------------------------------------
// 插入 / 移除
// ---------------------------------------------------------------------------

describe("插入与移除", () => {
    const makeIndex = () => new PackedSpatialIndex<TestEntity>(80, 64);
    const big = new AABB(-1000, -1000, 1000, 1000);

    it("insert 后可查到，remove 后不可查到", () => {
        const index = makeIndex();
        const entity = new TestEntity(1, 0, 0);

        index.insert(entity);
        assert.deepEqual(sortedIds(index.search(big)), [1]);

        assert.equal(index.remove(entity), true);
        assert.deepEqual(sortedIds(index.search(big)), []);
    });

    it("remove 未插入的实体返回 false；重复 remove 第二次返回 false", () => {
        const index = makeIndex();
        const entity = new TestEntity(1, 0, 0);

        assert.equal(index.remove(entity), false, "从未插入 → false");
        index.insert(entity);
        assert.equal(index.remove(entity), true);
        assert.equal(index.remove(entity), false, "已移除 → false");
    });

    it("重复 insert 同一实体不会产生重复（Set 语义）", () => {
        const index = makeIndex();
        const entity = new TestEntity(1, 0, 0);

        index.insert(entity);
        index.insert(entity);
        index.insert(entity);

        assert.equal(collect(index.search(big)).length, 1);
        assert.equal(internals(index).entityCells.size, 1);
    });

    it("实体移动后重新 insert：旧位置查不到、新位置查得到", () => {
        const index = makeIndex();
        const entity = new TestEntity(1, 0, 0);
        index.insert(entity);

        entity.moveTo(600, 600);
        index.insert(entity);

        assert.equal(collect(index.search(new AABB(-50, -50, 50, 50))).length, 0, "旧位置应为空");
        assert.deepEqual(sortedIds(index.search(new AABB(500, 500, 700, 700))), [1]);
        assert.equal(internals(index).entityCells.size, 1, "同一实体不应残留两组格子记录");
    });

    it("跨多格的实体记录全部覆盖格，且移除时全部摘除（不留空桶）", () => {
        const index = makeIndex();
        const entity = new TestEntity(1, 0, 0, 100, 100);
        index.insert(entity);

        // 盒 ±100, cellSize=80 → 列 floor(-100/80)=-2 .. floor(100/80)=1 共 4 列, 行同理 → 4x4 = 16 格
        const keys = internals(index).entityCells.get(entity)!;
        assert.equal(keys.length, 16);
        assert.equal(new Set(keys).size, 16, "覆盖格不得重复");
        assert.equal(internals(index).buckets.size, 16);
        assertNoEmptyBuckets(index);

        index.remove(entity);
        assert.equal(internals(index).buckets.size, 0, "移除后所有格子都应从 buckets 摘掉");
        assert.equal(internals(index).entityCells.size, 0);
    });

    it("同一格内多实体：移除其一不影响其它", () => {
        const index = makeIndex();
        const a = new TestEntity(1, ONE_CELL_CENTER, ONE_CELL_CENTER);
        const b = new TestEntity(2, ONE_CELL_CENTER + 10, ONE_CELL_CENTER + 10);
        const c = new TestEntity(3, ONE_CELL_CENTER + 20, ONE_CELL_CENTER + 20);
        for (const e of [a, b, c]) index.insert(e);

        index.remove(b);

        assert.deepEqual(sortedIds(index.search(big)), [1, 3]);
        assertNoEmptyBuckets(index);
        assertEntityCellsConsistent(index);
    });
});

// ---------------------------------------------------------------------------
// 查询语义
// ---------------------------------------------------------------------------

describe("查询语义", () => {
    const makeIndex = () => new PackedSpatialIndex<TestEntity>(80, 64);

    it("单格区域走快速路径：命中与不命中", () => {
        const index = makeIndex();
        index.insert(new TestEntity(1, ONE_CELL_CENTER, ONE_CELL_CENTER));

        assert.deepEqual(sortedIds(index.search(new AABB(0, 0, 40, 40))), [1]);
        assert.deepEqual(sortedIds(index.search(new AABB(500, 500, 540, 540))), [], "空格 → 空结果");
    });

    it("跨格实体在跨格查询中只返回一次（代际去重生效）", () => {
        const index = makeIndex();
        const huge = new TestEntity(1, 0, 0, 300, 300);
        index.insert(huge);

        assert.equal(collect(index.search(new AABB(-400, -400, 400, 400))).length, 1, "不得按格重复产出");
        assert.equal(collect(index.search(new AABB(-100, -100, 100, 100))).length, 1);
    });

    it("严格相交语义：贴边（接触但不重叠）不算命中", () => {
        const index = makeIndex();
        index.insert(new TestEntity(1, 0, 0, 10, 10)); // 盒 = (-10,-10)..(10,10)

        assert.equal(collect(index.search(new AABB(10, 10, 30, 30))).length, 0, "minX == 盒 maxX 属于接触，不命中");
        assert.equal(collect(index.search(new AABB(-30, -30, -10, -10))).length, 0);
        assert.equal(collect(index.search(new AABB(9.99, 9.99, 30, 30))).length, 1, "稍微重叠即命中");
    });

    it("零面积区域等价于点查询（含该点的盒会被返回）", () => {
        const index = makeIndex();
        index.insert(new TestEntity(1, 0, 0, 10, 10));

        assert.deepEqual(sortedIds(index.search(new AABB(0, 0, 0, 0))), [1], "点 (0,0) 在盒内");
        assert.deepEqual(sortedIds(index.search(new AABB(50, 50, 50, 50))), [], "点 (50,50) 不在盒内");
    });

    it("连续多次相同查询结果一致（代际计数递增不应丢结果）", () => {
        const index = makeIndex();
        for (let i = 0; i < 20; i++) index.insert(new TestEntity(i, i * 30, i * 30));

        const region = new AABB(-50, -50, 700, 700);
        const first = sortedIds(index.search(region));
        for (let k = 0; k < 5; k++) {
            assert.deepEqual(sortedIds(index.search(region)), first, `第 ${k + 2} 次查询结果应与首次一致`);
        }
        assert.equal(first.length, 20);
    });

    it("半途中断的查询不影响后续查询", () => {
        const index = makeIndex();
        for (let i = 0; i < 20; i++) index.insert(new TestEntity(i, i * 60, ONE_CELL_CENTER));
        const region = new AABB(-500, -500, 5000, 500);

        let taken = 0;
        for (const _ of index.search(region)) {
            if (++taken === 2) break; // generator 未跑完
        }

        assert.equal(sortedIds(index.search(region)).length, 20, "中断后重新查询应仍返回全部");
    });

    it("clear 后重新插入同一批实体对象：结果必须完整（searchGen 复用回归）", () => {
        const index = makeIndex();
        const entities = makeEntities(new Rng(7), 50, 900);
        for (const e of entities) index.insert(e);

        const region = new AABB(-2000, -2000, 2000, 2000);
        const before = sortedIds(index.search(region));
        assert.equal(before.length, 50);

        index.clear();
        for (const e of entities) index.insert(e);

        assert.deepEqual(sortedIds(index.search(region)), before, "clear 后重插不得漏结果");
    });

    it("老实体与新实体混排：代际去重不会把新实体当成本代已产出", () => {
        const index = makeIndex();
        const region = new AABB(-2000, -2000, 2000, 2000);

        const old = makeEntities(new Rng(11), 30, 800);
        for (const e of old) index.insert(e);
        index.search(region); // 让老实体都带上当前代际

        const fresh = makeEntities(new Rng(12), 30, 800);
        for (const e of fresh) index.insert(e);

        assert.equal(sortedIds(index.search(region)).length, 60);
    });

    it("forEach 与 search 结果一致；空区域不调用 consumer", () => {
        const index = makeIndex();
        for (let i = 0; i < 10; i++) index.insert(new TestEntity(i, i * 40, i * 40));

        const region = new AABB(-100, -100, 500, 500);
        const viaSearch = sortedIds(index.search(region));
        const viaForEach: number[] = [];
        index.forEach(region, e => viaForEach.push(e.getId()));

        assert.deepEqual(viaForEach.sort((a, b) => a - b), viaSearch);

        let calls = 0;
        index.forEach(new AABB(100_000, 100_000, 100_010, 100_010), () => calls++);
        assert.equal(calls, 0);
    });

    it("findFirst：命中即停，predicate 不再继续调用", () => {
        const index = makeIndex();
        for (let i = 0; i < 30; i++) index.insert(new TestEntity(i, i * 20, ONE_CELL_CENTER));
        const region = new AABB(-100, -100, 1000, 100);

        let predicateCalls = 0;
        let hit = false;
        index.findFirst(region, () => {
            predicateCalls++;
            hit = true;
            return true; // 第一个候选就命中
        });

        assert.equal(predicateCalls, 1, "第一个候选命中后应立刻停止");
        assert.equal(hit, true);
        assert.doesNotThrow(() => index.findFirst(region, () => false), "无匹配不应抛错");
    });
});

// ---------------------------------------------------------------------------
// 世界范围钳置
// ---------------------------------------------------------------------------

describe("世界范围钳置（cell 坐标 clamp 到 ±half）", () => {
    const makeIndex = () => new PackedSpatialIndex<TestEntity>(10, 4); // 世界 ≈ ±40

    it("世界外的实体被钳到边界格，同区域的越界查询仍能命中（最终用真实坐标过滤）", () => {
        const index = makeIndex();
        index.insert(new TestEntity(1, 1_000_000, 1_000_000, 5, 5));

        assert.deepEqual(sortedIds(index.search(new AABB(999_000, 999_000, 1_001_000, 1_001_000))), [1]);
    });

    it("世界外实体不会出现在世界内的查询结果中（钳置不产生假阳性）", () => {
        const index = makeIndex();
        index.insert(new TestEntity(1, 1_000_000, 1_000_000, 5, 5));
        index.insert(new TestEntity(2, 0, 0, 5, 5));

        assert.deepEqual(sortedIds(index.search(new AABB(-40, -40, 40, 40))), [2]);
    });

    it("超大查询区域仍能找到世界内实体", () => {
        const index = makeIndex();
        index.insert(new TestEntity(1, 0, 0, 5, 5));

        assert.deepEqual(sortedIds(index.search(new AABB(-1e9, -1e9, 1e9, 1e9))), [1]);
    });

    it("世界范围外的查询区域返回空（不是报错）", () => {
        const index = makeIndex();
        index.insert(new TestEntity(1, 0, 0, 5, 5));

        assert.deepEqual(sortedIds(index.search(new AABB(1e6, 1e6, 1e6 + 100, 1e6 + 100))), []);
    });
});

// ---------------------------------------------------------------------------
// 池化后的内部不变量
// ---------------------------------------------------------------------------

describe("内部不变量（SetPool 接入后）", () => {
    it("持续 churn 后：无空桶、entityCells 一致、桶与池无别名", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const rng = new Rng(2024);
        const entities = makeEntities(rng, 800, 3000);
        for (const e of entities) index.insert(e);

        for (let frame = 0; frame < 300; frame++) {
            for (let i = 0; i < 40; i++) {
                const e = entities[rng.int(entities.length)];
                e.moveTo(rng.range(-3000, 3000), rng.range(-3000, 3000));
                index.insert(e);
            }
            if (frame % 25 === 0) {
                assertNoEmptyBuckets(index);
                assertEntityCellsConsistent(index);
                assertPoolAliasingSafe(index);
            }
        }
    });

    it("remove 掉全部实体后 buckets 为空（池化不得让空桶滞留）", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const entities = makeEntities(new Rng(5), 300, 2000);
        for (const e of entities) index.insert(e);
        assert.ok(internals(index).buckets.size > 0);

        for (const e of entities) index.remove(e);

        assert.equal(internals(index).buckets.size, 0);
        assert.equal(internals(index).entityCells.size, 0);
        assertNoEmptyBuckets(index);
    });

    it("池中闲置 Set 全部为空，且数量不超过 maxIdle", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const rng = new Rng(6);

        for (let round = 0; round < 5; round++) {
            const entities = makeEntities(rng, 400, 2500);
            for (const e of entities) index.insert(e);
            for (const e of entities) index.remove(e); // 全部归还
        }

        const pool = internals(index).pool;
        assert.ok(pool.idle.length <= pool.maxIdle, `idle=${pool.idle.length} 不得超过 maxIdle=${pool.maxIdle}`);
        for (const set of pool.idle) assert.equal(set.size, 0, "闲置 Set 必须是空的");
    });

    it("并发桶数受世界尺寸/分布约束，不随实体数无限增长（真实地图尺寸）", () => {
        // 与 ClientEntityManager 一致：World 1760x1120，GridSpatialIndex 的 margin = 160
        const MAP_W = 1760;
        const MAP_H = 1120;
        const MARGIN = 160;
        const CELL = 80;
        const cellCount = Math.ceil((MAP_W + 2 * MARGIN) / CELL) * Math.ceil((MAP_H + 2 * MARGIN) / CELL);

        const bucketCounts: number[] = [];
        for (const count of [2000, 20000]) {
            const rng = new Rng(77);
            const index = new PackedSpatialIndex<TestEntity>(CELL, 1 << 13);
            for (let i = 0; i < count; i++) {
                index.insert(new TestEntity(i, rng.range(0, MAP_W), rng.range(0, MAP_H), 8, 8));
            }
            const buckets = internals(index).buckets.size;
            assert.ok(buckets <= cellCount, `桶数 ${buckets} 不可能超过可覆盖格数 ${cellCount}`);
            bucketCounts.push(buckets);
        }

        // 密度增加 10 倍，桶数几乎不涨（已经接近饱和）
        assert.ok(bucketCounts[1]! <= bucketCounts[0]! * 1.25,
            `实体数 x10 后桶数不应显著增长: ${bucketCounts.join(" → ")}`);
        assert.ok(bucketCounts[0]! > 100, `2000 个实体应该占住大量格子, 实际 ${bucketCounts[0]}`);
    });

    it("同一实体数、集中分布 vs 稀疏分布：并发桶数差异巨大（热点格）", () => {
        const concentrated = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const sparse = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const rng = new Rng(13);

        for (let i = 0; i < 2000; i++) {
            concentrated.insert(new TestEntity(i, rng.range(0, 200), rng.range(0, 200), 8, 8));
            sparse.insert(new TestEntity(i, rng.range(0, 8000), rng.range(0, 8000), 8, 8));
        }

        const concentratedBuckets = internals(concentrated).buckets.size;
        const sparseBuckets = internals(sparse).buckets.size;
        assert.ok(sparseBuckets > concentratedBuckets * 5,
            `稀疏分布应产生多得多的桶: 集中=${concentratedBuckets} 稀疏=${sparseBuckets}`);
    });

    it("复用确实发生：churn 场景下稳态新增分配远小于桶创建次数", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const rng = new Rng(8);
        const entities = makeEntities(rng, 500, 3000);
        for (const e of entities) index.insert(e);

        const pool = internals(index).pool;
        const missesAfterBuild = pool.misses;

        for (let frame = 0; frame < 400; frame++) {
            for (let i = 0; i < 50; i++) {
                const e = entities[rng.int(entities.length)];
                e.moveTo(rng.range(-3000, 3000), rng.range(-3000, 3000));
                index.insert(e);
            }
        }

        assert.ok(pool.hits > 10_000, `应大量命中复用, 实际 hits=${pool.hits}`);
        assert.ok(pool.misses - missesAfterBuild < 2000, `稳态后新增分配应很少, 实际 ${pool.misses - missesAfterBuild}`);
    });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------

describe("clear()", () => {
    it("清空索引后查询为空、内部结构为空（桶已归还池）", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const entities = makeEntities(new Rng(9), 200, 1500);
        for (const e of entities) index.insert(e);

        index.clear();

        assert.deepEqual(sortedIds(index.search(new AABB(-9999, -9999, 9999, 9999))), []);
        assert.equal(internals(index).buckets.size, 0);
        assert.equal(internals(index).entityCells.size, 0);
        assert.equal(internals(index).pool.outstanding, 0, "桶应已归还（不是被丢掉）");
        assert.ok(internals(index).pool.idle.length <= internals(index).pool.maxIdle);

        // 想立刻还内存就显式 drain（clear 不再代劳）
        internals(index).pool.drain();
        assert.equal(internals(index).pool.idle.length, 0);
    });

    it("clear 后可继续插入使用", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        index.insert(new TestEntity(1, 0, 0));
        index.clear();

        index.insert(new TestEntity(2, 100, 100));
        assert.deepEqual(sortedIds(index.search(new AABB(-50, -50, 200, 200))), [2]);
        assertNoEmptyBuckets(index);
    });

    it("clear() 把桶归还池：outstanding 归零、不漂移、重插能复用", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const entities = makeEntitiesInRect(new Rng(10), 300, 0, 0, 1760, 1120);
        for (const e of entities) index.insert(e);

        const pool = internals(index).pool;
        const bucketsBefore = internals(index).buckets.size;
        const missesBefore = pool.misses;

        index.clear();

        assert.equal(pool.outstanding, 0, "clear 后不应还有『已取出未归还』的 Set");
        assert.ok(pool.idle.length > 0, "归还的桶应留在池里（热池），否则同地图重插要重新分配");

        // 反复 clear + 重插：outstanding 不得累积（曾经 342 → 684 → 1026 漂移）
        for (let round = 0; round < 5; round++) {
            for (const e of entities) index.insert(e);
            assert.equal(pool.outstanding, internals(index).buckets.size,
                `round ${round}: outstanding 应等于活跃桶数`);
            index.clear();
            assert.equal(pool.outstanding, 0, `round ${round}: clear 后应归零`);
        }

        for (const e of entities) index.insert(e);
        const reloadMisses = pool.misses - missesBefore;
        assert.ok(reloadMisses < bucketsBefore,
            `重插应复用池中桶：新增分配 ${reloadMisses} 应小于桶数 ${bucketsBefore}`);
    });
});

// ---------------------------------------------------------------------------
// 随机对拍：暴力实现
// ---------------------------------------------------------------------------

describe("随机对拍（暴力实现为参照）", () => {
    it("1200 实体 / 600 帧 churn / 随机区域：结果始终与暴力一致", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const rng = new Rng(0xC0FFEE);
        const entities = makeEntities(rng, 1200, 4000);

        // 参照集只放"当前确实在索引里"的实体：remove 过的必须剔除，否则会假失败
        const active = new Set<TestEntity>();
        for (const e of entities) {
            index.insert(e);
            active.add(e);
        }

        let queries = 0;
        let removals = 0;
        for (let frame = 0; frame < 600; frame++) {
            for (let i = 0; i < 120; i++) {
                const e = entities[rng.int(entities.length)];
                if (active.has(e) && rng.next() < 0.05) {
                    index.remove(e);
                    active.delete(e);
                    removals++;
                } else {
                    e.moveTo(rng.range(-4000, 4000), rng.range(-4000, 4000));
                    index.insert(e);
                    active.add(e);
                }
            }
            if (frame % 10 === 0) {
                for (let q = 0; q < 6; q++) {
                    const x = rng.range(-4000, 4000);
                    const y = rng.range(-4000, 4000);
                    const w = rng.range(1, 1500);
                    const h = rng.range(1, 1500);
                    assertSameAsBruteForce(`frame=${frame} q=${q}`, index, [...active], new AABB(x, y, x + w, y + h));
                    queries++;
                }
                assertNoEmptyBuckets(index);
                assertPoolAliasingSafe(index);
            }
        }
        assert.ok(queries >= 300, `查询样本应足够多, 实际 ${queries}`);
        assert.ok(removals > 100, `应发生过足够多次 remove, 实际 ${removals}`);
    });

    it("极度聚集（所有实体挤在同一格）：结果与暴力一致", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 1 << 13);
        const entities: TestEntity[] = [];
        for (let i = 0; i < 500; i++) {
            // 中心都在 (20,20) 附近、盒 ±1 → 全都只在第 0 格
            const e = new TestEntity(i, ONE_CELL_CENTER + (i % 7) * 0.1, ONE_CELL_CENTER + (i % 5) * 0.1, 1, 1);
            entities.push(e);
            index.insert(e);
        }

        assertSameAsBruteForce("热点格全域", index, entities, new AABB(-200, -200, 200, 200));
        assertSameAsBruteForce("热点格局部", index, entities, new AABB(15, 15, 25, 25));
        assert.equal(internals(index).buckets.size, 1, "500 个实体应全在 1 个桶里");
    });

    it("极小世界（half=1，3x3 格）：结果与暴力一致", () => {
        const index = new PackedSpatialIndex<TestEntity>(10, 1);
        const rng = new Rng(3);
        const entities = makeEntities(rng, 200, 60, 0.2, 6);
        for (const e of entities) index.insert(e);

        for (let q = 0; q < 40; q++) {
            const x = rng.range(-200, 200);
            const y = rng.range(-200, 200);
            assertSameAsBruteForce(`3x3 q=${q}`, index, entities, new AABB(x, y, x + rng.range(1, 200), y + rng.range(1, 200)));
        }
    });
});

// ---------------------------------------------------------------------------
// 与 GridSpatialIndex 交叉对拍
// ---------------------------------------------------------------------------

describe("与 GridSpatialIndex 交叉对拍", () => {
    const WIDTH = 2000;
    const HEIGHT = 1400;
    const MARGIN = 160;
    const CELL = 80;

    it("世界内随机数据：两种索引返回同一集合", () => {
        const rng = new Rng(0xBEEF);

        // 两个索引各用一批实体：searchGen 是索引私有的去重命名空间，不能共享实体对象
        const packedEntities: TestEntity[] = [];
        const gridEntities: TestEntity[] = [];
        for (let i = 0; i < 600; i++) {
            const x = rng.range(0, WIDTH);
            const y = rng.range(0, HEIGHT);
            const half = rng.next() < 0.05 ? rng.range(20, 60) : 8;
            packedEntities.push(new TestEntity(i, x, y, half, half));
            gridEntities.push(new TestEntity(i, x, y, half, half));
        }

        const packed = new PackedSpatialIndex<TestEntity>(CELL, 1 << 13);
        const grid = new GridSpatialIndex<TestEntity>(WIDTH, HEIGHT, CELL, MARGIN);
        for (const e of packedEntities) packed.insert(e);
        for (const e of gridEntities) grid.insert(e);

        const queryRng = new Rng(0xF00D);
        for (let q = 0; q < 200; q++) {
            const x = queryRng.range(-MARGIN, WIDTH);
            const y = queryRng.range(-MARGIN, HEIGHT);
            const region = new AABB(x, y, x + queryRng.range(1, 800), y + queryRng.range(1, 800));

            assert.deepEqual(
                sortedIds(packed.search(region)),
                sortedIds(grid.search(region)),
                `第 ${q} 次查询两索引结果不一致 (region ${region.minX.toFixed(1)},${region.minY.toFixed(1)}..${region.maxX.toFixed(1)},${region.maxY.toFixed(1)})`,
            );
        }
    });

    it("差异点（已知语义分歧）：世界外实体 —— Grid 丢弃，Packed 钳置到边界格", () => {
        const far = (id: number) => new TestEntity(id, WIDTH + 5000, HEIGHT + 5000, 8, 8);
        const hugeRegion = new AABB(-1e9, -1e9, 1e9, 1e9);

        const packed = new PackedSpatialIndex<TestEntity>(CELL, 1 << 13);
        const grid = new GridSpatialIndex<TestEntity>(WIDTH, HEIGHT, CELL, MARGIN);
        packed.insert(far(1));
        grid.insert(far(2));

        assert.equal(collect(packed.search(hugeRegion)).length, 1, "Packed 钳置到边界格, 因此仍可被查到");
        assert.equal(collect(grid.search(hugeRegion)).length, 0, "Grid 对完全在世界外的盒直接不索引");
    });
});

// ---------------------------------------------------------------------------
// 与 SetPool 的接线
// ---------------------------------------------------------------------------

describe("与 SetPool 的接线", () => {
    it("索引持有 SetPool 实例，且归还的桶被复用（同实例）", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 64);
        const entity = new TestEntity(1, ONE_CELL_CENTER, ONE_CELL_CENTER);
        index.insert(entity);

        assert.equal(internals(index).buckets.size, 1, "本用例要观察单个桶, 实体必须只占一格");
        const before = [...internals(index).buckets.values()][0];
        index.remove(entity);

        assert.equal(before.size, 0, "回到池中前必须已被清空");
        assert.ok(internals(index).pool.idle.includes(before), "移除后该桶应回到池中");

        index.insert(new TestEntity(2, ONE_CELL_CENTER, ONE_CELL_CENTER));

        const after = [...internals(index).buckets.values()][0];
        assert.equal(after, before, "再次插入应复用同一个 Set 实例");
        assert.equal(after.size, 1, "复用后桶里应只有新实体");
        assert.equal(internals(index).pool.hits, 1);
    });

    it("池被 drain 后仍能正常工作（内存被释放但索引语义不变）", () => {
        const index = new PackedSpatialIndex<TestEntity>(80, 64);
        const pool = internals(index).pool as unknown as SetPool<TestEntity>;

        index.insert(new TestEntity(1, ONE_CELL_CENTER, ONE_CELL_CENTER));
        pool.drain();

        assert.deepEqual(sortedIds(index.search(new AABB(0, 0, 80, 80))), [1]);
        index.insert(new TestEntity(2, ONE_CELL_CENTER + 40, ONE_CELL_CENTER + 40));
        assert.deepEqual(sortedIds(index.search(new AABB(0, 0, 80, 80))), [1, 2]);
        assertNoEmptyBuckets(index);
    });
});
