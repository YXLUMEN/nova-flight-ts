/**
 * RenderCache 性能基准
 * 运行方式：npm run dev 后访问 /bench/cache-bench.html
 *
 * 四个视角回答"缓存与直接绘制差距有多大"：
 *  0. Canvas API 调用次数（确定性，不依赖计时）——每次"直接绘制"要打十几条指令，
 *     "缓存命中"只要 1 次 drawImage，这是差距的来源；
 *  1. 计时（三次取中位数）：direct / cached / miss(NoCache，每次完整重建)；
 *  2. 构建成本与整群回本帧数；
 *  3. 典型场景每帧成本 + 结论；
 *  另含可视 A/B 对照（页面顶部 canvas，左半 direct 右半 cached）、
 *       导弹"弹体缓存 + 动态尾焰" A/B、LRU vs Map 命中率模拟。
 */

import {BaseEnemyRender} from "../src/client/render/entity/BaseEnemyRender.ts";
import {BulletEntityRender} from "../src/client/render/entity/BulletEntityRender.ts";
import {CIWSBulletEntityRender} from "../src/client/render/entity/CIWSBulletEntityRender.ts";
import {DecoyEntityRender} from "../src/client/render/entity/DecoyEntityRender.ts";
import {MapRenderCache} from "../src/client/render/cache/MapRenderCache.ts";
import {LRURenderCache} from "../src/client/render/cache/LRURenderCache.ts";
import type {RenderCache} from "../src/client/render/cache/RenderCache.ts";
import {buildSprite} from "../src/client/render/cache/RenderCache.ts";
import {AABB} from "../src/utils/math/AABB.ts";

import {DPR} from "../src/utils/uit.ts";
import {EntityColor} from "../src/world/entity/EntityColor";

// ---------- 目标画布（与游戏同构：DPR 变换） ----------
const target = new OffscreenCanvas(1600, 900);
const tctx = target.getContext("2d")!;
tctx.setTransform(DPR, 0, 0, DPR, 0, 0);

// ---------- probe：把 protected 的 drawSprite/applyTransform/spriteKey/width/height 暴露出来 ----------
class EnemyProbe extends BaseEnemyRender {
    public draw(ctx: any, e: any): void {
        this.drawSprite(ctx, e);
    }

    public transform(ctx: any, e: any, a: number): void {
        this.transform(ctx, e, a);
    }

    public key(e: any): number {
        return this.spriteKey(e);
    }

    public bnd(e: any): AABB {
        return (this as any).bounds(e);
    }
}

class BulletProbe extends BulletEntityRender {
    public draw(ctx: any, e: any): void {
        this.drawSprite(ctx, e);
    }

    public transform(ctx: any, e: any, a: number): void {
        this.transform(ctx, e, a);
    }

    public key(e: any): number {
        return this.spriteKey(e);
    }

    public bnd(e: any): AABB {
        return (this as any).bounds(e);
    }
}

class CIWSProbe extends CIWSBulletEntityRender {
    public draw(ctx: any): void {
        this.drawSprite(ctx);
    }

    public transform(ctx: any, e: any, a: number): void {
        this.transform(ctx, e, a);
    }

    public bnd(e: any): AABB {
        return (this as any).bounds(e);
    }
}

class DecoyProbe extends DecoyEntityRender {
    public draw(ctx: any): void {
        this.drawSprite(ctx);
    }

    public transform(ctx: any, e: any, a: number): void {
        this.transform(ctx, e, a);
    }

    public bnd(e: any): AABB {
        return (this as any).bounds(e);
    }
}

class MissileProbe extends DecoyEntityRender {
    public draw(ctx: any): void {
        this.drawSprite(ctx);
    }

    public transform(ctx: any, e: any, a: number): void {
        this.transform(ctx, e, a);
    }

    public key(e: any): number {
        return this.spriteKey();
    }

    public bnd(e: any): AABB {
        return (this as any).bounds(e);
    }
}

// ---------- 假实体（只提供 renderer 用到的字段） ----------
const POS = {x: 100, y: 100};
const enemyProbe = new EnemyProbe();
const bulletProbe = new BulletProbe();
const ciwsProbe = new CIWSProbe();
const decoyProbe = new DecoyProbe();
const missileProbe = new MissileProbe();

const enemyFake = {
    getLerpPos: () => POS,
    getLerpYaw: () => 0,   // rotate 后为 0，便于像素对比
    color: new EntityColor('#ff9940', '#FF994066')
};

const bulletFake = {
    getLerpPos: () => POS,
    color: new EntityColor('#ffd75e', '#fff2b0'),
    getType: () => ({hashCode: () => 7}),
    getDimensions: () => ({halfWidth: 2}),
    getWidth: () => 4,
    getHeight: () => 4,
};

const ciwsFake = {
    getLerpPos: () => POS,
    getYaw: () => 0,
    color: new EntityColor('#66ccff'),
};

const decoyFake = {
    getLerpPos: () => POS,
    getWidth: () => 6,
    age: 0,
};

const missileFake = {
    getLerpPos: () => POS,
    getLerpYaw: () => 0.3,
    color: new EntityColor('#ffd75e'),
    isIgnite: () => true,
};

// ---------- NoCache：每次都完整重建（缓存抖动的最坏情况） ----------
class NoCache<K> implements RenderCache<K> {
    private last: ImageBitmap | null = null;

    public get<E>(_key: K, bounds: AABB,
                  draw: (ctx: any, e: E) => void, target: E): ImageBitmap {
        const bmp = buildSprite(bounds, draw as any, target);
        this.last?.close();
        this.last = bmp;
        return bmp;
    }

    public clear(): void {
        this.last?.close();
        this.last = null;
    }
}

// ---------- 计时工具（三次取中位数） ----------
function benchOp(fn: () => void, ops: number): number {
    for (let i = 0; i < 1000; i++) fn();          // 预热
    const t0 = performance.now();
    for (let i = 0; i < ops; i++) fn();
    return (performance.now() - t0) / ops;         // ms/op
}

function benchOpMed(fn: () => void, ops: number): number {
    const runs = [benchOp(fn, ops), benchOp(fn, ops), benchOp(fn, ops)].sort((a, b) => a - b);
    return runs[1];
}

function buildCost(makeCache: () => RenderCache<any>, key: any, bounds: AABB,
                   drawFn: (ctx: any, e: any) => void, e: any, k = 300): number {
    for (let i = 0; i < 50; i++) makeCache().get(key, bounds, drawFn, e);   // 预热
    const t0 = performance.now();
    for (let i = 0; i < k; i++) makeCache().get(key, bounds, drawFn, e);
    return (performance.now() - t0) / k;           // ms/次构建
}

const OPS = 100 * 200;   // 100 实体 × 200 帧

// ---------- 计数 ctx：统计每次绘制的 Canvas API 调用（确定性，不依赖光栅化速度） ----------
function makeCounter() {
    const counts = new Map<string, number>();
    const count = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);
    const gradient = () => {
        count("createGradient");
        return {addColorStop: () => count("addColorStop")};
    };
    const ctx: any = {
        save: () => count("save"), restore: () => count("restore"),
        translate: () => count("translate"), rotate: () => count("rotate"), scale: () => count("scale"),
        beginPath: () => count("beginPath"), moveTo: () => count("moveTo"), lineTo: () => count("lineTo"),
        closePath: () => count("closePath"), arc: () => count("arc"), ellipse: () => count("ellipse"),
        fill: () => count("fill"), stroke: () => count("stroke"), fillRect: () => count("fillRect"),
        drawImage: () => count("drawImage"), setTransform: () => count("setTransform"),
        getTransform: () => ({a: 1, b: 0, c: 0, d: 1, e: 0, f: 0}),
        createLinearGradient: gradient,
        createRadialGradient: gradient,
    };
    for (const p of ["fillStyle", "strokeStyle", "lineWidth", "globalAlpha", "lineCap", "lineJoin"]) {
        Object.defineProperty(ctx, p, {
            set: () => count(`set:${p}`),
            get: () => null,
            configurable: true,
        });
    }
    return {ctx, counts};
}

function totalCalls(counts: Map<string, number>): number {
    let n = 0;
    for (const v of counts.values()) n += v;
    return n;
}

// ---------- 各形状：direct / cached / miss（ctx 参数化，便于计时与计数复用） ----------
const renderDirectEnemy = (ctx: any, e: any) => {
    ctx.save();
    enemyProbe.transform(ctx, e, 0.5);
    enemyProbe.draw(ctx, e);
    ctx.restore();
};
const renderCachedEnemy = (ctx: any, e: any) => enemyProbe.render(e, ctx, 0.5);
const directEnemy = () => renderDirectEnemy(tctx, enemyFake);
const cachedEnemy = () => renderCachedEnemy(tctx, enemyFake);
const noCacheEnemy = new NoCache<number>();
const missEnemy = () => {
    const e = enemyFake;
    const b = enemyProbe.bnd(e);
    const s = noCacheEnemy.get(enemyProbe.key(e), b, (ctx: any, t: any) => enemyProbe.draw(ctx, t), e);
    tctx.save();
    enemyProbe.transform(tctx, e, 0.5);
    tctx.drawImage(s, b.minX, b.minY, b.getWidth(), b.getHeight());
    tctx.restore();
};

const renderDirectBullet = (ctx: any, e: any) => {
    ctx.save();
    bulletProbe.transform(ctx, e, 0.5);
    bulletProbe.draw(ctx, e);
    ctx.restore();
};
const renderCachedBullet = (ctx: any, e: any) => bulletProbe.render(e, ctx, 0.5);
const directBullet = () => renderDirectBullet(tctx, bulletFake);
const cachedBullet = () => renderCachedBullet(tctx, bulletFake);
const noCacheBullet = new NoCache<number>();
const missBullet = () => {
    const e = bulletFake;
    const b = bulletProbe.bnd(e);
    const s = noCacheBullet.get(bulletProbe.key(e), b,
        (ctx: any, t: any) => bulletProbe.draw(ctx, t), e);
    tctx.save();
    tctx.translate(POS.x, POS.y);
    tctx.drawImage(s, b.minX, b.minY, b.getWidth(), b.getHeight());
    tctx.restore();
};

const renderDirectCIWS = (ctx: any, e: any) => {
    ctx.save();
    ciwsProbe.transform(ctx, e, 0.5);
    ciwsProbe.draw(ctx);
    ctx.restore();
};
const renderCachedCIWS = (ctx: any, e: any) => ciwsProbe.render(e, ctx, 0.5);
const directCIWS = () => renderDirectCIWS(tctx, ciwsFake);
const cachedCIWS = () => renderCachedCIWS(tctx, ciwsFake);

const renderDirectDecoy = (ctx: any, e: any) => {
    ctx.save();
    decoyProbe.transform(ctx, e, 0.5);
    decoyProbe.draw(ctx);
    ctx.restore();
};
const renderCachedDecoy = (ctx: any, e: any) => decoyProbe.render(e, ctx, 0.5);
const directDecoy = () => renderDirectDecoy(tctx, decoyFake);
const cachedDecoy = () => renderCachedDecoy(tctx, decoyFake);

// ---------- 导弹 A/B：全量直接渲染 vs 弹体缓存 + 动态尾焰 ----------
const renderDirectMissile = (ctx: any, e: any) => {
    ctx.save();
    missileProbe.transform(ctx, e, 0.5);
    missileProbe.draw(ctx);
    ctx.restore();
};
const renderCacheMissile = (ctx: any, e: any) => missileProbe.render(e, ctx, 0.5);

const directMissile = () => renderDirectMissile(tctx, missileFake);
const cacheMissile = () => renderCacheMissile(tctx, missileFake);
const missileCached = () => renderCacheMissile(tctx, missileFake);

// ---------- 命中率模拟 ----------
function mulberry32(seed: number): () => number {
    return () => {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function simulate(cache: RenderCache<number>, stream: number[]): { hit: number; miss: number } {
    const seen = new Map<number, ImageBitmap>();
    let hit = 0;
    const drawFn = (ctx: any) => ctx.fillRect(0, 0, 1, 1);
    const SIM_BOUNDS = new AABB(-2, -2, 2, 2);
    for (const k of stream) {
        const bmp = cache.get(k, SIM_BOUNDS, drawFn, {});
        if (seen.get(k) === bmp) hit++;
        else seen.set(k, bmp);
    }
    return {hit, miss: stream.length - hit};
}

function buildStreams(): Record<string, number[]> {
    const N = 2000;
    const rng = mulberry32(42);
    const uniform: number[] = [];
    const hot: number[] = [];
    const tiny: number[] = [];
    for (let i = 0; i < N; i++) {
        uniform.push(i % 24);                                  // 24 键轮换，容量 16 → 必抖
        hot.push(rng() < 0.8 ? Math.floor(rng() * 8) : 8 + Math.floor(rng() * 16)); // 8 热键占 80%
        tiny.push(i % 3);                                      // 3 键封闭集
    }
    return {uniform, hot, tiny};
}

// ================= 执行 =================
console.log(`[环境] DPR=${DPR} devicePixelRatio=${globalThis.devicePixelRatio} canvas=1600x900`);

// 可视 A/B：左半 direct、右半 cached（同一位置、同一假实体）
const vis = document.getElementById("vis") as HTMLCanvasElement | null;
if (vis) {
    const vctx = vis.getContext("2d")!;
    const drawAt = (fn: (ctx: any, e: any) => void, e: any, x: number) => {
        POS.x = x;
        POS.y = 64;
        fn(vctx, e);
    };
    vctx.fillStyle = "#14161a";
    vctx.fillRect(0, 0, vis.width, vis.height);
    drawAt(renderDirectEnemy, enemyFake, 32);
    drawAt(renderDirectBullet, bulletFake, 72);
    drawAt(renderDirectCIWS, ciwsFake, 104);
    drawAt(renderDirectDecoy, decoyFake, 140);
    drawAt(renderCachedEnemy, enemyFake, 256 + 32);
    drawAt(renderCachedBullet, bulletFake, 256 + 72);
    drawAt(renderCachedCIWS, ciwsFake, 256 + 104);
    drawAt(renderCachedDecoy, decoyFake, 256 + 140);
    POS.x = 100;
    POS.y = 100;
}

// 调用次数统计（确定性）
interface CallRow {
    shape: string;
    direct: number;
    cached: number;
    detail: string;
}

const callRows: CallRow[] = [];

function countCalls(name: string, direct: (ctx: any, e: any) => void, cached: (ctx: any, e: any) => void, e: any): void {
    // 预热：用真实 ctx 构建一次 sprite，确保计数时全部命中（否则首次 get 会用计数 ctx 构建，污染计数）
    cached(tctx, e);
    const dc = makeCounter();
    direct(dc.ctx, e);
    const cc = makeCounter();
    cached(cc.ctx, e);
    const dTotal = totalCalls(dc.counts);
    const cTotal = totalCalls(cc.counts);
    const pathOps = ["beginPath", "moveTo", "lineTo", "closePath", "arc", "ellipse", "fill", "stroke"]
        .map(k => `${k}×${dc.counts.get(k) ?? 0}`).join(" ");
    callRows.push({shape: name, direct: dTotal, cached: cTotal, detail: pathOps});
}

countCalls("BaseEnemy", renderDirectEnemy, renderCachedEnemy, enemyFake);
countCalls("Bullet", renderDirectBullet, renderCachedBullet, bulletFake);
countCalls("CIWS", renderDirectCIWS, renderCachedCIWS, ciwsFake);
countCalls("Decoy", renderDirectDecoy, renderCachedDecoy, decoyFake);
countCalls("Missile", renderDirectMissile, renderCacheMissile, missileFake);

// 像素覆盖抽查：sprite(drawImage) 与直接绘制覆盖像素数是否一致（容差 ±25%）
function pixelCoverage(canvas: OffscreenCanvas): number {
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
    return n;
}

function spotCheck(name: string, direct: (ctx: any, e: any) => void, cached: (ctx: any, e: any) => void, e: any): void {
    // 注意：direct/cached 内部自带 translate(POS)，这里不能预平移，否则双重平移导致形状被裁剪
    // 画布取 160×160：容纳全部 sprite（CIWS 75 高、Decoy 64 见方），避免画布裁剪干扰覆盖数
    POS.x = 80;
    POS.y = 80;
    const c1 = new OffscreenCanvas(160, 160);
    const g1 = c1.getContext("2d")!;
    direct(g1, e);

    const c2 = new OffscreenCanvas(160, 160);
    const g2 = c2.getContext("2d")!;
    cached(g2, e);

    const n1 = pixelCoverage(c1);
    const n2 = pixelCoverage(c2);
    const ok = n1 > 0 && n2 > 0 && n1 / n2 > 0.75 && n1 / n2 < 1.33;
    console.log(`[正确性] ${name}: direct=${n1}px sprite=${n2}px ${ok ? "OK" : "MISMATCH"}`);
    POS.x = 100;
    POS.y = 100;
}

spotCheck("BaseEnemy", renderDirectEnemy, renderCachedEnemy, enemyFake);
spotCheck("Bullet", renderDirectBullet, renderCachedBullet, bulletFake);
spotCheck("CIWS", renderDirectCIWS, renderCachedCIWS, ciwsFake);
spotCheck("Decoy", renderDirectDecoy, renderCachedDecoy, decoyFake);
spotCheck("Missile", renderDirectMissile, renderCacheMissile, missileFake);

// 计时（三次取中位数）
interface Row {
    shape: string;
    count: number;
    direct: number;    // µs/op
    cached: number;    // µs/op
    miss: number | null;
    build: number;     // µs/构建
    speedup: number;   // direct / cached
    breakEven: number; // 整群回本帧数
}

const rows: Row[] = [];

function addRow(
    shape: string,
    count: number,
    direct: () => void,
    cached: () => void,
    miss: (() => void) | null,
    build: number
): void {
    const d0 = benchOpMed(direct, OPS) * 1000;   // µs
    const c0 = benchOpMed(cached, OPS) * 1000;
    // const m = miss ? benchOpMed(miss, OPS) * 1000 : null;

    const c1 = benchOpMed(cached, OPS) * 1000;
    const d1 = benchOpMed(direct, OPS) * 1000;   // µs

    const d = (d0 + d1) / 2;
    const c = (c0 + c1) / 2;

    const savingPerFrame = (d - c) * count;     // µs/帧（整群）
    rows.push({
        shape, count, direct: d, cached: c, miss: null, build: build * 1000,
        speedup: d / c,
        breakEven: savingPerFrame > 0 ? build * 1000 / savingPerFrame : -1,
    });
}

// 构建成本（每组一个新鲜缓存）
const enemyBuild = buildCost(() => new MapRenderCache<string>(4), enemyProbe.key(enemyFake), enemyProbe.bnd(enemyFake),
    (ctx: any, e: any) => enemyProbe.draw(ctx, e), enemyFake);
const bulletBuild = buildCost(() => new MapRenderCache<number>(4), bulletProbe.key(bulletFake),
    bulletProbe.bnd(bulletFake),
    (ctx: any, e: any) => bulletProbe.draw(ctx, e), bulletFake);
const ciwsBuild = buildCost(() => new MapRenderCache<string>(4), "c", ciwsProbe.bnd(ciwsFake),
    (ctx: any) => ciwsProbe.draw(ctx), ciwsFake);
const decoyBuild = buildCost(() => new MapRenderCache<string>(4), "d", decoyProbe.bnd(decoyFake),
    (ctx: any) => decoyProbe.draw(ctx), decoyFake);
const missileBuild = buildCost(() => new MapRenderCache<string>(4), missileProbe.key(missileFake), missileProbe.bnd(missileFake),
    (ctx: any) => missileProbe.draw(ctx), missileFake);

addRow("BaseEnemy (32×30)", 60, directEnemy, cachedEnemy, missEnemy, enemyBuild);
addRow("Bullet (7×7)", 200, directBullet, cachedBullet, missBullet, bulletBuild);
addRow("CIWS (75×3)", 300, directCIWS, cachedCIWS, null, ciwsBuild);
addRow("Decoy (64×64)", 12, directDecoy, cachedDecoy, null, decoyBuild);
addRow('Missile', 12, directMissile, cacheMissile, null, missileBuild);

// LRU vs Map 命中率模拟
const streams = buildStreams();
const simRows: Array<[string, string, number, number]> = [];
for (const [name, stream] of Object.entries(streams)) {
    const lru = simulate(new LRURenderCache<number>(16), stream);
    const map = simulate(new MapRenderCache<number>(16), stream);
    simRows.push([name, "LRU", lru.hit, lru.miss]);
    simRows.push([name, "Map", map.hit, map.miss]);
}

// ================= 输出 =================
const out = document.getElementById("out")!;
const env = document.getElementById("env")!;
env.innerHTML = `DPR=${DPR}（devicePixelRatio=${globalThis.devicePixelRatio}），目标画布 1600×900，OPS=${OPS}（计时三次取中位数）。`;

let html = "";

html += `<h2>0. Canvas API 调用次数 / 实体 / 帧（确定性）</h2>`;
html += `<table><tr><th>形状</th><th>direct</th><th>cached 命中</th><th>减少</th><th class="dim">direct 的 path 操作</th></tr>`;
for (const r of callRows) {
    html += `<tr><td>${r.shape}</td><td>${r.direct}</td><td>${r.cached}</td>
        <td class="good">${(r.direct / r.cached).toFixed(1)}×</td>
        <td class="dim">${r.detail}</td></tr>`;
}
html += `</table><p class="note">这是差距的根源：direct 每帧打十几条指令（含 path 构建 + fill/stroke 光栅化），命中后只剩 save/translate/rotate/drawImage/restore。</p>`;

html += `<h2>1. 单实体单帧成本（µs，三次取中位数）</h2>`;
html += `<table><tr><th>形状</th><th>direct</th><th>cached 命中</th><th>miss（每次重建）</th><th>加速比</th></tr>`;
for (const r of rows) {
    const cls = r.speedup > 1 ? "good" : "bad";
    html += `<tr><td>${r.shape}</td>
        <td>${r.direct.toFixed(2)}</td>
        <td>${r.cached.toFixed(2)}</td>
        <td>${r.miss === null ? "—" : r.miss.toFixed(2)}</td>
        <td class="${cls}">${r.speedup.toFixed(2)}×</td></tr>`;
}
html += `</table><p class="note">加速比 = direct / cached；&gt;1 表示缓存更快。miss 列是 NoCache（每次完整重建）的代价。</p>`;

html += `<h2>2. 构建成本与整群回本帧数</h2>`;
html += `<table><tr><th>形状</th><th>sprite 构建（µs）</th><th>典型数量/帧</th><th>整群回本帧数</th></tr>`;
for (const r of rows) {
    html += `<tr><td>${r.shape}</td>
        <td>${r.build.toFixed(1)}</td>
        <td>${r.count}</td>
        <td>${r.breakEven > 0 ? r.breakEven.toFixed(1) : "无收益"}</td></tr>`;
}
html += `</table><p class="note">回本帧数 = 构建成本 ÷ (每实体每帧节省 × 数量)。实体存活帧数高于此值，缓存才划算。</p>`;

html += `<h2>3. 典型场景每帧成本（ms：direct / cached / miss）</h2>`;
html += `<table><tr><th>场景</th><th>direct</th><th>cached</th><th>miss（全部重建）</th><th>每帧节省</th></tr>`;
for (const r of rows) {
    const save = (r.direct - r.cached) * r.count / 1000;
    html += `<tr><td>${r.shape} ×${r.count}</td>
        <td>${(r.direct * r.count / 1000).toFixed(3)}</td>
        <td>${(r.cached * r.count / 1000).toFixed(3)}</td>
        <td>${r.miss === null ? "—" : (r.miss * r.count / 1000).toFixed(3)}</td>
        <td class="${save > 0 ? "good" : "bad"}">${save > 0 ? "+" + save.toFixed(3) : "−" + (-save).toFixed(3)}</td></tr>`;
}
const totalSave = rows.reduce((s, r) => s + Math.max(0, r.direct - r.cached) * r.count, 0) / 1000;
html += `</table><p class="note">帧预算 10ms（perFrame=10ms）。上述场景合计：direct→cached 每帧最多省 <b>${totalSave.toFixed(2)}ms</b>。</p>`;

html += `<h2>4. LRU vs Map 命中率（容量 16，2000 次 get）</h2>`;
html += `<table><tr><th>key 流</th><th>缓存</th><th>命中</th><th>重建</th><th>命中率</th></tr>`;
for (const [stream, kind, hit, miss] of simRows) {
    html += `<tr><td>${stream}</td><td>${kind}</td><td>${hit}</td><td>${miss}</td><td>${(hit / 2000 * 100).toFixed(1)}%</td></tr>`;
}
html += `</table><p class="note">uniform=24 键轮换(活跃集&gt;容量)；hot=8 热键占 80%+16 冷键；tiny=3 键封闭集。</p>`;

out.innerHTML = html;

console.table(callRows.map(r => ({
    shape: r.shape,
    direct: r.direct,
    cached: r.cached,
    reduce: (r.direct / r.cached).toFixed(1) + "x"
})));
console.table(rows.map(r => ({
    shape: r.shape, direct_us: r.direct.toFixed(2), cached_us: r.cached.toFixed(2),
    miss_us: r.miss?.toFixed(2) ?? "-", speedup: r.speedup.toFixed(2) + "x",
    build_us: r.build.toFixed(1), breakEven: r.breakEven > 0 ? r.breakEven.toFixed(1) : "-",
})));
// console.log(`[导弹] direct=${md.toFixed(2)}µs  cachedBody+flame=${mc.toFixed(2)}µs`);
console.table(simRows.map(([s, k, hit, miss]) => ({
    stream: s,
    cache: k,
    hit,
    miss,
    rate: (hit / 2000 * 100).toFixed(1) + "%"
})));
