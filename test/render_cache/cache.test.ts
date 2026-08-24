/**
 * RenderCache 语义测试
 * 运行方式：npm run dev 后访问 /test/render_cache/cache.test.html
 *
 * 覆盖点：
 *  - SingleCache  : key 无关、只构建一次、clear 释放
 *  - DoubleRenderCache : boolean 双槽独立、各构建一次
 *  - MapRenderCache : FIFO 淘汰（按插入序）、get 不刷新位置、淘汰/clear 时 close
 *  - LRURenderCache : LRU 淘汰、get 刷新位置、淘汰/clear 时 close
 *  - 尺寸 = ceil(w*DPR)；draw 收到的 ctx 变换 = scale(DPR) + translate(-minX, -minY)
 *  - 命中时不重复调用 draw
 */

import {DPR} from "../../src/utils/uit.ts";
import {AABB} from "../../src/utils/math/AABB.ts";
import {MemoryLRU} from "../../src/utils/collection/MemoryLRU.ts";
import {SingleCache} from "../../src/client/render/cache/SingleCache.ts";
import {DoubleRenderCache} from "../../src/client/render/cache/DoubleRenderCache.ts";
import {MapRenderCache} from "../../src/client/render/cache/MapRenderCache.ts";
import {LRURenderCache} from "../../src/client/render/cache/LRURenderCache.ts";

// ---------- 迷你断言 ----------
interface Result {
    name: string;
    pass: boolean;
    detail: string;
}

const results: Result[] = [];

function check(name: string, cond: boolean, detail: string = ""): void {
    results.push({name, pass: !!cond, detail});
}

function eq<T>(name: string, actual: T, expected: T): void {
    check(name, Object.is(actual, expected), `实际=${String(actual)} 期望=${String(expected)}`);
}

// ---------- close 计数（打补丁，测完恢复） ----------
let closed = 0;
const origClose = ImageBitmap.prototype.close;
(ImageBitmap.prototype.close as any) = function (this: ImageBitmap) {
    closed++;
    return origClose.call(this);
};

// ---------- 工具 ----------
const B = new AABB(-2, -2, 2, 2); // 4×4 内容

function countDraw(): { fn: (ctx: any, e?: any) => void; get: () => number } {
    let n = 0;
    return {
        fn: (ctx: any) => {
            n++;
            ctx.fillRect(0, 0, 1, 1);
        },
        get: () => n,
    };
}

// ---------- 测试 ----------
function testSingle(): void {
    const d = countDraw();
    const c = new SingleCache<string>();
    const b1 = c.get("a", B, d.fn, {});
    const b2 = c.get("b", B, d.fn, {});
    eq("Single: 不同 key 返回同一实例", b1 === b2, true);
    eq("Single: 只构建一次", d.get(), 1);
    c.clear();
    eq("Single: clear 释放位图", closed, 1);
    const b3 = c.get("a", B, d.fn, {});
    check("Single: clear 后重新构建", b3 !== b1, "clear 后应得到新位图");
}

function testDouble(): void {
    const d = countDraw();
    const c = new DoubleRenderCache();
    const s0a = c.get(true, B, d.fn, {});
    const s0b = c.get(true, B, d.fn, {});
    const s1a = c.get(false, B, d.fn, {});
    const s1b = c.get(false, B, d.fn, {});
    eq("Double: true 槽命中同一实例", s0a === s0b, true);
    eq("Double: false 槽命中同一实例", s1a === s1b, true);
    check("Double: 两槽位图不同", s0a !== s1a, "两槽应各自构建");
    eq("Double: 各构建一次", d.get(), 2);
    c.clear();
    eq("Double: clear 释放两个位图", closed, 3);
}

function testMapFIFO(): void {
    const d = countDraw();
    const c = new MapRenderCache<string>(4);
    const a = c.get("a", B, d.fn, {});
    const b = c.get("b", B, d.fn, {});
    const cBmp = c.get("c", B, d.fn, {});
    const dmp = c.get("d", B, d.fn, {});
    c.get("a", B, d.fn, {});              // 命中，但不刷新插入序
    const e = c.get("e", B, d.fn, {});    // 满 → 淘汰最早插入的 a
    eq("Map: 淘汰触发 close", closed, 4);

    // 先验证存活项（此时缓存 {b,c,d,e}，全部命中）
    check("Map: b/c/d/e 存活", b === c.get("b", B, d.fn, {})
        && cBmp === c.get("c", B, d.fn, {})
        && dmp === c.get("d", B, d.fn, {})
        && e === c.get("e", B, d.fn, {}), "b/c/d/e 应命中原实例");
    // 再验证 a 被淘汰（miss → 重建，会顺带再淘汰一项，无妨）
    check("Map: a 被 FIFO 淘汰（get 不刷新位置）",
        a !== c.get("a", B, d.fn, {}),
        "a 刚被访问过，但 FIFO 仍按插入序淘汰它");

    c.clear();
    eq("Map: clear 释放全部", closed, 9);
}

function testLRU(): void {
    const d = countDraw();
    const c = new LRURenderCache<string>(2);
    const a = c.get("a", B, d.fn, {});
    const b = c.get("b", B, d.fn, {});
    c.get("a", B, d.fn, {});              // 刷新位置 → 顺序变 b,a
    const cBmp = c.get("c", B, d.fn, {}); // 满 → 淘汰最久未用的 b
    eq("LRU: 淘汰触发 close", closed, 10);

    check("LRU: a 存活（最近被访问）", a === c.get("a", B, d.fn, {}), "a 应命中原实例");
    check("LRU: c 存活", cBmp === c.get("c", B, d.fn, {}), "c 应命中");
    check("LRU: b 被淘汰后重建", b !== c.get("b", B, d.fn, {}), "b 是最久未用，应被淘汰");

    c.clear();
    eq("LRU: clear 释放全部", closed, 13);
}

type T = { a: number; d: number; e: number; f: number };

function testSizeAndTransform(): void {
    const c = new MapRenderCache<string>(8);
    // 内容 bbox = (-2.5,-3.5)..(2.5,3.5) → 位图 5×7
    const bounds = new AABB(-2.5, -3.5, 2.5, 3.5);
    let t: T | null = null;
    const bmp = c.get("s", bounds, (ctx: any) => {
        const tr = ctx.getTransform();
        t = {a: tr.a, d: tr.d, e: tr.e, f: tr.f};
        ctx.fillRect(0, 0, 1, 1);
    }, {});
    eq("尺寸: bitmap 宽 = ceil(w*DPR)", bmp.width, Math.ceil(5 * DPR));
    eq("尺寸: bitmap 高 = ceil(h*DPR)", bmp.height, Math.ceil(7 * DPR));
    check("变换: scale(DPR) + translate(-minX, -minY)",
        t !== null &&
        // @ts-ignore
        Math.abs(t.a - DPR) < 1e-9 &&
        // @ts-ignore
        Math.abs(t.d - DPR) < 1e-9 &&
        // @ts-ignore
        Math.abs(t.e - 2.5 * DPR) < 1e-9 &&
        // @ts-ignore
        Math.abs(t.f - 3.5 * DPR) < 1e-9,
        JSON.stringify(t));
}

function testHitNoRedraw(): void {
    const d = countDraw();
    const c = new LRURenderCache<string>(4);
    for (let i = 0; i < 5; i++) c.get("k", B, d.fn, {});
    eq("命中: draw 只调用一次", d.get(), 1);
}

function testEdgeCases(): void {
    // 0×0 尺寸：预期抛错（OffscreenCanvas 非法输入）。
    // 不吞错——断言它确实抛了；单条失败不影响后续测试（执行段有 try/catch 兜底）。
    let threw: unknown = null;
    try {
        const c = new MapRenderCache<string>(2);
        c.get("z", new AABB(0, 0, 0, 0), (ctx: any) => ctx.fillRect(0, 0, 0, 0), {});
    } catch (e) {
        threw = e;
    }
    check("边界: 0×0 应抛错（预期行为）", threw !== null,
        `实际: ${threw === null ? "未抛错" : String(threw)}`);

    // MemoryLRU 容量下限为 1
    const lru = new MemoryLRU<string, number>(0);
    lru.set("a", 1);
    lru.set("b", 2);
    eq("MemoryLRU: capacity 下限 1（b 淘汰 a）", lru.get("a"), null);
    eq("MemoryLRU: b 存活", lru.get("b"), 2);

    // getOrInsertComputed 只计算一次
    let computed = 0;
    const lru2 = new MemoryLRU<string, number>(4);
    const v1 = lru2.getOrInsertComputed("x", () => {
        computed++
        return 42;
    });
    const v2 = lru2.getOrInsertComputed("x", () => {
        computed++;
        return 43;
    });
    eq("MemoryLRU: getOrInsertComputed 命中不重算", computed, 1);
    eq("MemoryLRU: getOrInsertComputed 值", v1, 42);
    eq("MemoryLRU: getOrInsertComputed 二次取值", v2, 42);
}

// ---------- 执行（逐项隔离：单条抛异常不中断整个套件） ----------
const testFns: Array<() => void> = [
    testSingle,
    testDouble,
    testMapFIFO,
    testLRU,
    testSizeAndTransform,
    testHitNoRedraw,
    testEdgeCases,
];
for (const fn of testFns) {
    try {
        fn();
    } catch (e) {
        results.push({name: `${fn.name} 执行时抛异常`, pass: false, detail: String(e)});
    }
}

// 恢复 close
(ImageBitmap.prototype.close as any) = origClose;

// ---------- 输出 ----------
const env = document.getElementById("env")!;
env.textContent = `DPR=${DPR}（dpr=${globalThis.devicePixelRatio}） ImageBitmap=${typeof ImageBitmap !== "undefined" ? "可用" : "不可用"}`;

const passed = results.filter(r => r.pass).length;
const failed = results.length - passed;

const summary = document.getElementById("summary")!;
summary.textContent = `通过 ${passed} / ${results.length}${failed > 0 ? `　失败 ${failed}` : ""}`;
summary.className = failed > 0 ? "fail" : "pass";

const table = document.getElementById("result")!;
for (const r of results) {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = r.name;
    const tdStatus = document.createElement("td");
    tdStatus.textContent = r.pass ? "PASS" : "FAIL";
    tdStatus.className = r.pass ? "pass" : "fail";
    const tdDetail = document.createElement("td");
    tdDetail.textContent = r.pass ? "" : r.detail;
    tdDetail.className = "dim";
    tr.append(tdName, tdStatus, tdDetail);
    table.append(tr);
}

console.table(results);
