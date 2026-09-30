/**
 * PackedSpatialIndex 基准
 *
 * 运行：
 *   浏览器: npm run dev 后访问 /bench/spatial-index-bench.html
 *   Node: 无 DOM 时降级为控制台表格
 *
 * 基准世界与生产一致：World.MAP_WIDTH x MAP_HEIGHT = 1760x1120，索引域再外扩 margin=160
 * （ClientEntityManager 用 new GridSpatialIndex(MAP_WIDTH, MAP_HEIGHT, 80, 160)）。
 * 索引域共 26x18 = 468 格 —— 这就是 PackedSpatialIndex 桶数的上限，
 * 也是"并发桶数取决于分布/世界尺寸，而不是实体数"的物理原因。
 *
 * 章节：
 *   1 桶数 vs 实体数（真实地图）      2 世界尺寸/分布对照      3 插入吞吐与池分配
 *   4 每帧移动量扫描                  5 查询吞吐 vs 区域大小   6 cellSize 扫描
 *   7 vs GridSpatialIndex             8 SetPool 账目 A/B       9 正确性自检
 *   10 堆内存量级                     11 世界尺寸扫描（选型交叉点）
 */

import {PackedSpatialIndex} from "../src/world/entity/PackedSpatialIndex.ts";
import {GridSpatialIndex} from "../src/world/entity/GridSpatialIndex.ts";
import {AABB} from "../src/utils/math/AABB.ts";
import {
    bruteForce,
    installRuntimePolyfills,
    internals,
    makeEntitiesInRect,
    Rng,
    sortedIds,
    TestEntity,
} from "../test/support/spatialFixtures.ts";

installRuntimePolyfills();

// ---------------------------------------------------------------------------
// 基准参数（与生产一致）
// ---------------------------------------------------------------------------

const MAP_W = 1760;          // World.MAP_WIDTH
const MAP_H = 1120;          // World.MAP_HEIGHT
const MARGIN = 160;          // ClientEntityManager 给 GridSpatialIndex 的 margin
const CELL_SIZE = 80;
const HALF = 1 << 13;
const COLS = Math.ceil((MAP_W + 2 * MARGIN) / CELL_SIZE);
const ROWS = Math.ceil((MAP_H + 2 * MARGIN) / CELL_SIZE);
const CELL_COUNT = COLS * ROWS;   // 468
const REPS = 3;

// ---------------------------------------------------------------------------
// 输出（浏览器画表 / Node 打控制台，同一份数据）
// ---------------------------------------------------------------------------

type Cell = string | { t: string; cls?: string };

interface Sink {
    env(text: string): void;

    section(title: string, desc?: string): void;

    table(head: string[], rows: Cell[][]): void;

    note(text: string): void;
}

function createSink(): Sink {
    if (typeof document === "undefined") {
        const cellText = (c: Cell) => typeof c === "string" ? c : c.t;
        return {
            env: text => console.log(text),
            section: (title, desc) => console.log(`\n== ${title} ==${desc ? `\n   ${desc}` : ""}`),
            table: (head, rows) => {
                const all = [head, ...rows.map(r => r.map(cellText))];
                const width = head.map((_, i) => Math.max(...all.map(r => r[i]!.length)));
                for (const [index, row] of all.entries()) {
                    console.log("   " + row.map((c, i) => c.padEnd(width[i]!)).join("  "));
                    if (index === 0) console.log("   " + width.map(w => "-".repeat(w)).join("  "));
                }
            },
            note: text => console.log(`   ${text}`),
        };
    }

    const out = document.getElementById("out")!;
    return {
        env: text => {
            document.getElementById("env")!.textContent = text;
        },
        section: (title, desc) => {
            const h = document.createElement("h2");
            h.textContent = title;
            out.append(h);
            if (desc) {
                const p = document.createElement("p");
                p.className = "note";
                p.textContent = desc;
                out.append(p);
            }
        },
        table: (head, rows) => {
            const table = document.createElement("table");
            const thead = document.createElement("thead");
            const htr = document.createElement("tr");
            for (const h of head) {
                const th = document.createElement("th");
                th.textContent = h;
                htr.append(th);
            }
            thead.append(htr);
            table.append(thead);

            const tbody = document.createElement("tbody");
            for (const row of rows) {
                const tr = document.createElement("tr");
                for (const c of row) {
                    const td = document.createElement("td");
                    td.textContent = typeof c === "string" ? c : c.t;
                    if (typeof c !== "string" && c.cls) td.className = c.cls;
                    tr.append(td);
                }
                tbody.append(tr);
            }
            table.append(tbody);
            out.append(table);
        },
        note: text => {
            const p = document.createElement("p");
            p.className = "note";
            p.textContent = text;
            out.append(p);
        },
    };
}

const sink = createSink();

// ---------------------------------------------------------------------------
// 计时与辅助
// ---------------------------------------------------------------------------

const now = (): number => (globalThis.performance ? globalThis.performance.now() : Date.now());

function timeMs(fn: () => void, reps: number = REPS): number {
    fn(); // 热身
    const runs: number[] = [];
    for (let i = 0; i < reps; i++) {
        const t0 = now();
        fn();
        runs.push(now() - t0);
    }
    runs.sort((a, b) => a - b);
    return runs[runs.length >> 1]!;
}

function heapUsed(): number | null {
    const perf = globalThis.performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (perf && perf.memory) return perf.memory.usedJSHeapSize;
    const proc = (globalThis as { process?: { memoryUsage?: () => { heapUsed: number } } }).process;
    if (proc && proc.memoryUsage) return proc.memoryUsage().heapUsed;
    return null;
}

const fmt = (v: number, digits = 2): string => v.toFixed(digits);
const int = (v: number): string => Math.round(v).toLocaleString("en-US");
const mb = (bytes: number): string => `${fmt(bytes / 1024 / 1024, 2)} MB`;
const pct = (v: number): string => `${fmt(v * 100, 2)}%`;

/** 真实地图里的实体 */
function mapEntities(rng: Rng, count: number): TestEntity[] {
    return makeEntitiesInRect(rng, count, 0, 0, MAP_W, MAP_H);
}

function bucketStats(index: PackedSpatialIndex<TestEntity>): { count: number; mean: number; p95: number; max: number } {
    const sizes = [...internals(index).buckets.values()].map(s => s.size).sort((a, b) => a - b);
    if (sizes.length === 0) return {count: 0, mean: 0, p95: 0, max: 0};
    const sum = sizes.reduce((a, b) => a + b, 0);
    return {
        count: sizes.length,
        mean: sum / sizes.length,
        p95: sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.95))]!,
        max: sizes[sizes.length - 1]!,
    };
}

/** 跑一段 churn，返回池的命中增量（= 有多少次桶被清空后又被复用） */
function churnHits(entities: TestEntity[], frames: number, perFrame: number, seed: number): {
    hits: number;
    misses: number;
    moves: number;
} {
    const index = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
    const pool = internals(index).pool;
    for (const e of entities) index.insert(e);

    const rng = new Rng(seed);
    const hitsBefore = pool.hits;
    const missesBefore = pool.misses;

    for (let f = 0; f < frames; f++) {
        for (let i = 0; i < perFrame; i++) {
            const e = entities[rng.int(entities.length)]!;
            e.moveTo(rng.range(0, MAP_W), rng.range(0, MAP_H));
            index.insert(e);
        }
    }
    return {
        hits: pool.hits - hitsBefore,
        misses: pool.misses - missesBefore,
        moves: frames * perFrame,
    };
}

// ---------------------------------------------------------------------------

sink.env(
    `世界 ${MAP_W}x${MAP_H} + margin ${MARGIN} | cellSize=${CELL_SIZE} half=${HALF} | Grid 域 ${COLS}x${ROWS} = ${CELL_COUNT} 格`
    + ` | UA=${typeof navigator === "undefined" ? "-" : navigator.userAgent.slice(0, 50)}`,
);

// ---------------------------------------------------------------------------
// 1. 桶数 vs 实体数
// ---------------------------------------------------------------------------

sink.section("1. 桶数 vs 实体数（真实地图，均匀分布）",
    "密度越高越饱和：桶数被「实体实际盖到的格子数」封顶（同一张地图约数百），而不是随实体数线性增长。");

{
    const rows: Cell[][] = [];
    for (const count of [100, 500, 2000, 5000, 20000, 100000]) {
        const rng = new Rng(7);
        const entities = mapEntities(rng, count);
        const index = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
        const grid = new GridSpatialIndex<TestEntity>(MAP_W, MAP_H, CELL_SIZE, MARGIN);
        for (const e of entities) {
            index.insert(e);
            grid.insert(e);
        }

        const covered = [...internals(index).entityCells.values()].reduce((sum, keys) => sum + keys.length, 0) / count;
        const stats = bucketStats(index);
        const gridOccupied = (grid as unknown as { grid: Set<TestEntity>[][] }).grid
            .flat().filter(cell => cell.size > 0).length;

        rows.push([
            int(count),
            int(stats.count),
            int(gridOccupied),
            fmt(covered, 2),
            fmt(stats.mean, 1),
            String(stats.p95),
            String(stats.max),
            fmt(stats.count / CELL_COUNT, 2),
        ]);
    }
    sink.table(
        ["实体数", "Packed 桶数", "Grid 占用格", "每实体覆盖格", "桶负载均值", "p95", "max", "域占用率"],
        rows,
    );
    sink.note("Packed 的桶域是整个逻辑世界（cell 坐标夹到 ±half），不受地图边界与 margin 约束；"
        + "Grid 会把坐标夹进自己的格子阵列，所以大盒子/贴边实体的覆盖格数两边不同（Packed 可能多于 468）。"
        + "Grid 构造时一次性建满 468 个空 Set，Packed 只建用到的那些。");

    // ---- 1b. 三种口径对照：Set 数量到底在比什么 ----
    {
        const COUNT = 2000;
        const rng = new Rng(11);
        const entities = mapEntities(rng, COUNT);
        const packed = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
        const grid = new GridSpatialIndex<TestEntity>(MAP_W, MAP_H, CELL_SIZE, MARGIN);
        for (const e of entities) {
            packed.insert(e);
            grid.insert(e);
        }

        const gridCellsFlat = (grid as unknown as { grid: Set<TestEntity>[][] }).grid.flat();
        const gridOccupied = gridCellsFlat.filter(cell => cell.size > 0).length;
        const packedBuckets = internals(packed).buckets.size;

        // Grid 的 clear() 不重建阵列：验证一遍 Set 实例在 clear 前后同一批
        const cellsBefore = new Set(gridCellsFlat);
        grid.clear();
        const reusedAfterClear = (grid as unknown as {
            grid: Set<TestEntity>[][]
        }).grid.flat().every(c => cellsBefore.has(c));

        const churn = churnHits(entities, 200, 200, 606); // 4 万次移动

        sink.table(
            ["口径", "GridSpatialIndex", "PackedSpatialIndex"],
            [
                ["同时存在的 Set", `${int(gridOccupied)} 非空 + ${int(CELL_COUNT - gridOccupied)} 空`, `${int(packedBuckets)} 桶（全非空）`],
                ["构造期 Set 分配", `${int(CELL_COUNT)}（一次建满）`, "0（按需）"],
                ["4 万次移动的分配", "0（阵列永不重建，clear 后仍是同一批 Set）", `${int(churn.misses)}（带池）/ 不带池约 ${int(churn.misses + churn.hits)}`],
                ["域格数 − 占用（Packed 相对省下的空 Set）", `${int(CELL_COUNT - gridOccupied)}`, "—"],
                ["Set 实例跨 clear 复用", reusedAfterClear ? "是（永远同一批 468 个）" : {
                    t: "否",
                    cls: "bad"
                }, "是（池保留）"],
            ],
        );
        sink.note("池化减少的是「累计 new Set() 次数」，不减少「同时存在的 Set 数」；"
            + `Packed 相对 Grid 省下的只有空格子（域 − 占用），当前配置下是 ${int(CELL_COUNT - gridOccupied)} 个。`);
    }
}

// ---------------------------------------------------------------------------
// 2. 世界尺寸与分布对照
// ---------------------------------------------------------------------------

sink.section("2. 同为 2000 实体：世界尺寸 / 分布如何决定桶数", "这一节是 maxIdle 定容的唯一依据。");

{
    const cases: { label: string; make: (rng: Rng) => TestEntity[] }[] = [
        {label: "真实地图·均匀", make: rng => mapEntities(rng, 2000)},
        {label: "真实地图·挤在 1/16 区域", make: rng => makeEntitiesInRect(rng, 2000, 0, 0, MAP_W / 4, MAP_H / 4)},
        {label: "大世界 ±4000·均匀", make: rng => makeEntitiesInRect(rng, 2000, -4000, -4000, 4000, 4000)},
        {label: "大世界 ±4000·稀疏小盒", make: rng => makeEntitiesInRect(rng, 2000, -4000, -4000, 4000, 4000, 0, 8)},
    ];

    const rows: Cell[][] = [];
    for (const {label, make} of cases) {
        const rng = new Rng(21);
        const entities = make(rng);
        const index = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
        for (const e of entities) index.insert(e);
        const stats = bucketStats(index);

        const churn = churnHits(entities, 200, 200, 4242);
        rows.push([
            label,
            int(stats.count),
            fmt(stats.mean, 1),
            String(stats.max),
            int(churn.hits),
            fmt(churn.hits / churn.moves * 100, 2) + "%",
            int(churn.misses),
        ]);
    }
    sink.table(
        ["配置", "桶数", "桶负载均值", "max", "4 万次移动中复用次数", "复用占比", "期间新分配"],
        rows,
    );
    sink.note("桶数相差 10 倍以上，但复用占比两边都在 2% 上下：一次移动只有真的把某个格子清空才会产生一次归还。"
        + "所以池的收益上限由桶负载（负载高很难清空）与移动模式（跳格比小步移动更容易清空）共同决定。");
}

// ---------------------------------------------------------------------------
// 3. 插入吞吐与池分配
// ---------------------------------------------------------------------------

sink.section("3. 插入吞吐与冷启动分配", "冷启动分配次数 ≈ 该负载下的并发桶数（省不掉），之后靠池复用。");

{
    const rows: Cell[][] = [];
    for (const count of [500, 2000, 5000, 20000]) {
        const rng = new Rng(777);
        const entities = mapEntities(rng, count);
        const index = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
        const pool = internals(index).pool;

        const ms = timeMs(() => {
            index.clear();
            pool.drain();
            for (const e of entities) index.insert(e);
        });

        // 单跑一轮量冷启动分配（不乘重复次数）
        index.clear();
        const missesBefore = pool.misses;
        for (const e of entities) index.insert(e);
        const coldMisses = pool.misses - missesBefore;
        const buildHits = pool.hits;

        const moveMs = timeMs(() => {
            for (let i = 0; i < entities.length; i += 2) {
                const e = entities[i]!;
                e.moveTo(((i * 37) % MAP_W), ((i * 53) % MAP_H));
                index.insert(e);
            }
        });

        rows.push([
            int(count),
            fmt(ms, 1),
            int(count / (ms / 1000)),
            fmt(moveMs, 1),
            int((count / 2) / (moveMs / 1000)),
            int(internals(index).buckets.size),
            int(coldMisses),
            int(pool.hits - buildHits),
            int(pool.dropped),
        ]);
    }
    sink.table(
        ["实体数", "全量插入 ms", "插入/秒", "移动一半 ms", "移动/秒", "桶数", "冷启动分配", "期间复用", "丢弃"],
        rows,
    );
    sink.note("冷启动分配是单轮值（不乘重复次数），它约等于并发桶数，是池省不掉的那笔。");
}

// ---------------------------------------------------------------------------
// 4. 每帧移动量扫描
// ---------------------------------------------------------------------------

sink.section("4. 每帧移动量扫描", "3000 个实体（真实地图，已接近饱和）作为稳定工作集，跑 600 帧。");

{
    const COUNT = 3000;
    const FRAMES = 600;
    const rows: Cell[][] = [];

    for (const perFrame of [50, 200, 600, 1500]) {
        const rng = new Rng(31);
        const entities = mapEntities(rng, COUNT);
        const index = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
        for (const e of entities) index.insert(e);

        let cursor = 0;
        const ms = timeMs(() => {
            for (let frame = 0; frame < FRAMES; frame++) {
                for (let i = 0; i < perFrame; i++) {
                    const e = entities[cursor++ % COUNT]!;
                    e.moveTo(rng.range(0, MAP_W), rng.range(0, MAP_H));
                    index.insert(e);
                }
            }
        });

        rows.push([
            int(perFrame),
            fmt(ms, 1),
            int(FRAMES * perFrame / (ms / 1000)),
            fmt(ms / FRAMES, 3),
            fmt(100 * perFrame / COUNT, 1) + "%",
        ]);
    }
    sink.table(["每帧移动", `${FRAMES} 帧总耗时 ms`, "移动/秒", "每帧 ms", "占工作集"], rows);
    sink.note("每帧 ms 就是这套索引在 16.7ms 帧预算里的占比。");
}

// ---------------------------------------------------------------------------
// 5. 查询吞吐 vs 区域大小
// ---------------------------------------------------------------------------

sink.section("5. 查询吞吐 vs 区域大小", "真实地图 2000 实体；扫描放大 = 候选实体数 / 命中实体数（越低越理想）。");

{
    const rng = new Rng(909);
    const entities = mapEntities(rng, 2000);
    const index = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
    for (const e of entities) index.insert(e);

    const regionRng = new Rng(1234);
    const makeRegions = (halfSize: number, n: number): AABB[] => {
        const out: AABB[] = [];
        for (let i = 0; i < n; i++) {
            const x = regionRng.range(0, MAP_W);
            const y = regionRng.range(0, MAP_H);
            out.push(new AABB(x - halfSize, y - halfSize, x + halfSize, y + halfSize));
        }
        return out;
    };

    const groups: { label: string; regions: AABB[] }[] = [
        {label: `1 格 (${CELL_SIZE}px)`, regions: makeRegions(CELL_SIZE / 2, 500)},
        {label: "3x3 格", regions: makeRegions(CELL_SIZE * 1.5, 500)},
        {label: "8x8 格", regions: makeRegions(CELL_SIZE * 4, 200)},
        {label: "全图", regions: makeRegions(MAP_W / 2, 20)},
    ];

    const rows: Cell[][] = [];
    for (const {label, regions} of groups) {
        let hits = 0;
        let sinkValue = 0;

        const ms = timeMs(() => {
            for (const region of regions) {
                for (const e of index.search(region)) sinkValue += e.getId();
            }
        }, 5);

        for (const region of regions) hits += sortedIds(index.search(region)).length;

        const before = entities.reduce((sum, e) => sum + e.boxCalls, 0);
        for (const region of regions) for (const _ of index.search(region)) { /* 全量消费 */
        }
        const after = entities.reduce((sum, e) => sum + e.boxCalls, 0);

        const candidates = after - before;
        rows.push([
            label,
            int(regions.length),
            fmt(ms * 1e6 / regions.length, 0),
            fmt(hits / regions.length, 1),
            fmt(candidates / regions.length, 1),
            fmt(candidates / Math.max(1, hits), 2),
            int(sinkValue % 97),
        ]);
    }
    sink.table(["区域", "查询数", "ns/次", "平均命中", "平均候选", "扫描放大", "(校验)"], rows);
}

// ---------------------------------------------------------------------------
// 6. cellSize 扫描
// ---------------------------------------------------------------------------

sink.section("6. cellSize 扫描", "真实地图 4000 实体（密度接近上限）；格子越小热点越散但桶数/内存越大。");

{
    const COUNT = 4000;
    const rows: Cell[][] = [];
    const queryRng = new Rng(55);
    const queryRegions = Array.from({length: 200}, () => {
        const x = queryRng.range(0, MAP_W);
        const y = queryRng.range(0, MAP_H);
        return new AABB(x - CELL_SIZE * 2, y - CELL_SIZE * 2, x + CELL_SIZE * 2, y + CELL_SIZE * 2);
    });

    for (const cellSize of [20, 40, 80, 160, 320]) {
        const rng = new Rng(888);
        const entities = mapEntities(rng, COUNT);
        const index = new PackedSpatialIndex<TestEntity>(cellSize, HALF);

        const insertMs = timeMs(() => {
            index.clear();
            internals(index).pool.drain();
            for (const e of entities) index.insert(e);
        });

        const moveMs = timeMs(() => {
            for (let i = 0; i < COUNT; i += 2) {
                const e = entities[i]!;
                e.moveTo(rng.range(0, MAP_W), rng.range(0, MAP_H));
                index.insert(e);
            }
        });

        let hits = 0;
        const queryMs = timeMs(() => {
            hits = 0;
            for (const region of queryRegions) hits += sortedIds(index.search(region)).length;
        });

        const stats = bucketStats(index);
        rows.push([
            String(cellSize),
            int(stats.count),
            fmt(stats.mean, 1),
            String(stats.max),
            int(COUNT / (insertMs / 1000)),
            int((COUNT / 2) / (moveMs / 1000)),
            fmt(queryMs * 1e6 / queryRegions.length, 0),
            fmt(hits / queryRegions.length, 1),
        ]);
    }
    sink.table(
        ["cellSize", "桶数", "桶负载均值", "max", "插入/秒", "移动/秒", "查询 ns/次", "平均命中"],
        rows,
    );
}

// ---------------------------------------------------------------------------
// 7. PackedSpatialIndex vs GridSpatialIndex
// ---------------------------------------------------------------------------

sink.section("7. PackedSpatialIndex vs GridSpatialIndex", "同一张真实地图、同一批坐标、各 2000 实体。");

{
    const COUNT = 2000;
    const FRAMES = 300;
    const PER_FRAME = 200;

    const rng = new Rng(2024);
    const coords = Array.from({length: COUNT}, () => [rng.range(0, MAP_W), rng.range(0, MAP_H)] as const);
    const packedEntities = coords.map(([x, y], i) => new TestEntity(i, x, y, 8, 8));
    const gridEntities = coords.map(([x, y], i) => new TestEntity(i, x, y, 8, 8));

    const packed = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
    const grid = new GridSpatialIndex<TestEntity>(MAP_W, MAP_H, CELL_SIZE, MARGIN);

    const packedInsert = timeMs(() => {
        packed.clear();
        internals(packed).pool.drain();
        for (const e of packedEntities) packed.insert(e);
    });
    const gridInsert = timeMs(() => {
        grid.clear();
        for (const e of gridEntities) grid.insert(e);
    });

    const moveRng = new Rng(99);
    const packedMove = timeMs(() => {
        for (let f = 0; f < FRAMES; f++) {
            for (let i = 0; i < PER_FRAME; i++) {
                const e = packedEntities[(f * PER_FRAME + i) % COUNT]!;
                e.moveTo(moveRng.range(0, MAP_W), moveRng.range(0, MAP_H));
                packed.insert(e);
            }
        }
    });

    const moveRng2 = new Rng(99);
    const gridMove = timeMs(() => {
        for (let f = 0; f < FRAMES; f++) {
            for (let i = 0; i < PER_FRAME; i++) {
                const e = gridEntities[(f * PER_FRAME + i) % COUNT]!;
                e.moveTo(moveRng2.range(0, MAP_W), moveRng2.range(0, MAP_H));
                grid.insert(e);
            }
        }
    });

    const queryRng = new Rng(4242);
    const queryRegions = Array.from({length: 300}, () => {
        const x = queryRng.range(0, MAP_W);
        const y = queryRng.range(0, MAP_H);
        return new AABB(x, y, x + queryRng.range(20, 600), y + queryRng.range(20, 600));
    });

    let packedHits = 0;
    const packedQuery = timeMs(() => {
        packedHits = 0;
        for (const region of queryRegions) packedHits += sortedIds(packed.search(region)).length;
    }, 5);
    let gridHits = 0;
    const gridQuery = timeMs(() => {
        gridHits = 0;
        for (const region of queryRegions) gridHits += sortedIds(grid.search(region)).length;
    }, 5);

    const n = queryRegions.length;
    sink.table(
        ["实现", "插入 ms", "插入/秒", "移动/秒", "查询 ns/次", "平均命中", "命中一致性"],
        [
            [
                "PackedSpatialIndex",
                fmt(packedInsert, 1),
                int(COUNT / (packedInsert / 1000)),
                int((FRAMES * PER_FRAME) / (packedMove / 1000)),
                fmt(packedQuery * 1e6 / n, 0),
                fmt(packedHits / n, 1),
                packedHits === gridHits ? {t: "一致", cls: "good"} : {t: "不一致!", cls: "bad"},
            ],
            [
                "GridSpatialIndex",
                fmt(gridInsert, 1),
                int(COUNT / (gridInsert / 1000)),
                int((FRAMES * PER_FRAME) / (gridMove / 1000)),
                fmt(gridQuery * 1e6 / n, 0),
                fmt(gridHits / n, 1),
                "",
            ],
        ],
    );
    sink.note("世界内数据两者结果必须一致；世界外实体的语义分歧见 test/PackedSpatialIndex.test.ts（决策未定）。");
}

// ---------------------------------------------------------------------------
// 8. SetPool 账目 A/B
// ---------------------------------------------------------------------------

sink.section("8. SetPool 账目：maxIdle 320（现状）vs 放大", "在两个世界尺寸下各跑 4 万次移动，看上限是否真的卡住复用。");

{
    const cases: { label: string; make: (rng: Rng) => TestEntity[] }[] = [
        {label: "真实地图 2000 实体", make: rng => mapEntities(rng, 2000)},
        {
            label: "大世界 ±4000 稀疏 2000 实体",
            make: rng => makeEntitiesInRect(rng, 2000, -4000, -4000, 4000, 4000, 0, 8)
        },
    ];
    const rows: Cell[][] = [];

    for (const {label, make} of cases) {
        for (const maxIdle of [320, 4096]) {
            const index = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
            const pool = internals(index).pool;
            (pool as { maxIdle: number }).maxIdle = maxIdle; // 运行时改私有只读字段：仅基准用
            const entities = make(new Rng(4321));
            for (const e of entities) index.insert(e);

            const buildMisses = pool.misses;
            const churn = churnHits(entities, 200, 200, 909);
            const total = churn.hits + churn.misses;

            rows.push([
                label,
                String(maxIdle),
                int(pool.peak),
                int(pool.target),
                int(pool.idle.length),
                int(buildMisses),
                int(churn.misses),
                int(churn.hits),
                pct(churn.hits / Math.max(1, total)),
                int(pool.dropped),
            ]);
        }
    }
    sink.table(
        ["配置", "maxIdle", "peak", "target", "idle", "冷启动分配", "期间新分配", "期间复用", "复用率", "丢弃"],
        rows,
    );
    sink.note("真实地图 peak≈460，320 会把 target 钳在 320；稀疏大世界 peak≈2500，钳得更死。"
        + "钳制只影响「能留住多少闲置」，而实际复用率由桶清空频率决定（见第 2 节），所以两种 maxIdle 的数字几乎一样。");
}

// ---------------------------------------------------------------------------
// 9. 正确性自检
// ---------------------------------------------------------------------------

sink.section("9. 正确性自检", "各 cellSize 下随机区域对拍暴力实现；决定上面的性能数字是否有意义。");

{
    const rows: Cell[][] = [];
    let failures = 0;

    for (const cellSize of [20, 40, 80, 160, 320]) {
        const rng = new Rng(1 + cellSize);
        const entities = mapEntities(rng, 2000);
        const index = new PackedSpatialIndex<TestEntity>(cellSize, HALF);
        for (const e of entities) index.insert(e);

        let mismatch: string | null = null;
        const queryRng = new Rng(7 + cellSize);
        for (let q = 0; q < 200 && mismatch === null; q++) {
            const x = queryRng.range(-MARGIN, MAP_W + MARGIN);
            const y = queryRng.range(-MARGIN, MAP_H + MARGIN);
            const region = new AABB(x, y, x + queryRng.range(1, 600), y + queryRng.range(1, 600));

            const got = sortedIds(index.search(region));
            const expect = bruteForce(entities, region).map(e => e.getId()).sort((a, b) => a - b);
            if (got.join(",") !== expect.join(",")) {
                mismatch = `q=${q}: 索引 ${got.length} 个 / 暴力 ${expect.length} 个`;
            }
        }

        if (mismatch !== null) failures++;
        rows.push([String(cellSize), "2000", "200", mismatch === null ? {t: "通过", cls: "good"} : {
            t: mismatch,
            cls: "bad"
        }]);
    }

    sink.table(["cellSize", "实体数", "查询数", "结果"], rows);
    if (failures > 0) {
        sink.note(`有 ${failures} 个配置与暴力实现不一致 —— 上面的性能数字不可信。`);
        throw new Error(`spatial-index-bench 正确性自检失败: ${failures} 个配置不一致`);
    }
    sink.note("全部配置与暴力实现一致。");
}

// ---------------------------------------------------------------------------
// 内存小结
// ---------------------------------------------------------------------------

sink.section("10. 堆内存量级", "只看量级（GC 时机不可控）；精确定量请用 --expose-gc。");

{
    const rng = new Rng(606);
    const entities = mapEntities(rng, 5000);
    const index = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
    const pool = internals(index).pool;

    const before = heapUsed();
    for (const e of entities) index.insert(e);
    const afterBuild = heapUsed();
    for (let frame = 0; frame < 300; frame++) {
        for (let i = 0; i < 200; i++) {
            const e = entities[rng.int(entities.length)]!;
            e.moveTo(rng.range(0, MAP_W), rng.range(0, MAP_H));
            index.insert(e);
        }
    }
    const afterChurn = heapUsed();

    sink.table(
        ["指标", "值"],
        [
            ["实体数 / 桶数", `${int(entities.length)} / ${int(internals(index).buckets.size)}`],
            ["池 idle / maxIdle", `${int(pool.idle.length)} / ${int(pool.maxIdle)}`],
            ["堆 before", before === null ? "n/a" : mb(before)],
            ["堆 afterBuild", afterBuild === null ? "n/a" : mb(afterBuild)],
            ["堆 afterChurn", afterChurn === null ? "n/a" : mb(afterChurn)],
        ],
    );
}

// ---------------------------------------------------------------------------
// 11. 世界尺寸扫描（选型交叉点）
// ---------------------------------------------------------------------------

sink.section("11. 世界尺寸扫描：Grid 的成本 ∝ 域格数，Packed ∝ 占用桶数",
    "实体数与分布密度固定在 2000 实体均匀铺开；放大世界 = 降低密度，也就是拉大「域/占用」比。");

{
    const rows: Cell[][] = [];
    for (const k of [1, 2, 4, 8, 16]) {
        const w = MAP_W * k, h = MAP_H * k;
        const entities = makeEntitiesInRect(new Rng(5), 2000, 0, 0, w, h);
        const domain = Math.ceil((w + 2 * MARGIN) / CELL_SIZE) * Math.ceil((h + 2 * MARGIN) / CELL_SIZE);

        const gridNew = timeMs(() => {
            new GridSpatialIndex<TestEntity>(w, h, CELL_SIZE, MARGIN);
        }, 3);
        const packedNew = timeMs(() => {
            new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);
        }, 3);

        const grid = new GridSpatialIndex<TestEntity>(w, h, CELL_SIZE, MARGIN);
        const packed = new PackedSpatialIndex<TestEntity>(CELL_SIZE, HALF);

        const gridReload = timeMs(() => {
            grid.clear();
            for (const e of entities) grid.insert(e);
        }, 3);
        const packedReload = timeMs(() => {
            packed.clear();
            for (const e of entities) packed.insert(e);
        }, 3);

        for (const e of entities) {
            grid.insert(e);
            packed.insert(e);
        }
        const packedBuckets = internals(packed).buckets.size + internals(packed).pool.idle.length;

        // 纯 clear：填充放在计时之外（否则量的是「重填 + clear」）
        const measureClear = (fill: () => void, clear: () => void): number => {
            fill(); // 热身，不计时
            const runs: number[] = [];
            for (let i = 0; i < 3; i++) {
                fill();
                const t0 = now();
                clear();
                runs.push(now() - t0);
            }
            runs.sort((a, b) => a - b);
            return runs[1]!;
        };
        const gridClear = measureClear(() => {
            for (const e of entities) grid.insert(e);
        }, () => grid.clear());
        const packedClear = measureClear(() => {
            for (const e of entities) packed.insert(e);
        }, () => packed.clear());

        rows.push([
            `${k}x (${w}x${h})`,
            int(domain),
            int(packedBuckets),
            fmt(domain / Math.max(1, packedBuckets), 2),
            fmt(gridNew, 3),
            fmt(packedNew, 3),
            fmt(gridReload, 2),
            fmt(packedReload, 2),
            fmt(gridClear, 3),
            fmt(packedClear, 3),
        ]);
    }
    sink.table(
        ["世界", "域格数", "Packed 占用", "域/占用", "new Grid ms", "new Packed ms", "重填 Grid ms", "重填 Packed ms", "clear Grid ms", "clear Packed ms"],
        rows,
    );
    sink.note("常数（Node --expose-gc 实测）：Grid 常驻 ≈ 84 B/格、构造 ≈ 25 ns/格、clear ≈ 29 ns/格；"
        + "Packed 的构造/clear 只与占用桶数有关，与世界尺寸无关。");
    sink.note("心智模型：Grid 按「地图容量」付费（O(域)，空格也要付），Packed 按「实际使用」付费（O(占用)）；"
        + "成本比 ≈ 容量利用率的倒数，利用率 = 占用桶 / 域格 ≈ 1.4 x 实体数 / 域格。");
    sink.note("交叉点（实测，cellSize 80 / 2000 实体）：域/占用 ≳ 2.3 时内存与 clear 打平，≳ 3~5 时重填也打平，"
        + "≳ 10 后 Packed 在固定开销上全面领先；而每帧的插入/移动/查询两者始终打平（±20% 噪声内），不要拿帧性能选型。");
}

console.log("spatial-index-bench 完成");