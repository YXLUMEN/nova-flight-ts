/**
 * SetPool 单元测试
 *
 * 直接针对池的自适应逻辑（这部分是 PackedSpatialIndex 接入的性能关键，
 * 用固定 adjustInterval 让小窗口可确定地复现，不依赖计时）。
 */

import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {SetPool} from "../src/utils/collection/SetPool.ts";
import {poolInternals} from "./support/spatialFixtures.ts";

/** 取 n 个（不归还） */
function acquireMany(pool: SetPool<number>, n: number): Set<number>[] {
    const out: Set<number>[] = [];
    for (let i = 0; i < n; i++) out.push(pool.acquire());
    return out;
}

function releaseAll(pool: SetPool<number>, sets: Set<number>[]): void {
    for (const s of sets) pool.release(s);
}

describe("SetPool 基础行为", () => {
    it("池空时每个 acquire 都是新 Set，且互不相同", () => {
        const pool = new SetPool<number>(2, 100, 1024, 4);
        const sets = acquireMany(pool, 5);

        assert.equal(new Set(sets).size, 5, "取出的 Set 必须互不相同");
        for (const s of sets) assert.equal(s.size, 0, "新 Set 必须是空的");

        const p = poolInternals<number>(pool);
        assert.equal(p.misses, 5);
        assert.equal(p.hits, 0);
        assert.equal(p.outstanding, 5);
    });

    it("release 后再 acquire 复用同一实例，且内容已被清空", () => {
        const pool = new SetPool<number>(2, 100, 1024, 4);
        const [first] = acquireMany(pool, 1);
        first.add(42);
        first.add(43);

        pool.release(first);
        assert.equal(first.size, 0, "归还时必须清空（复用前不得残留旧内容）");

        const again = pool.acquire();
        assert.equal(again, first, "LIFO 复用：应拿到刚归还的那个");
        assert.equal(again.size, 0, "复用到的 Set 必须是空的");
        assert.equal(poolInternals<number>(pool).hits, 1);
    });

    it("闲置容量受 target 限制：超出部分直接丢弃（不无限囤积）", () => {
        const pool = new SetPool<number>(1, 4, 1024, 4); // maxIdle = 4
        const sets = acquireMany(pool, 20);
        releaseAll(pool, sets);

        const p = poolInternals<number>(pool);
        assert.ok(p.idle.length <= 4, `idle=${p.idle.length} 不得超过 maxIdle`);
        assert.equal(p.dropped, 20 - p.idle.length);
    });

    it("超过 keepSizeLimit 的 Set 不复用（V8 的 clear 不归还大表）", () => {
        const pool = new SetPool<number>(2, 100, 4, 4); // keepSizeLimit = 4
        const [small] = acquireMany(pool, 1);
        const [atLimit] = acquireMany(pool, 1);
        const [overLimit] = acquireMany(pool, 1);

        small.add(1);
        atLimit.add(1);
        atLimit.add(2);
        atLimit.add(3);
        atLimit.add(4); // size === 4 → 仍复用
        overLimit.add(1);
        overLimit.add(2);
        overLimit.add(3);
        overLimit.add(4);
        overLimit.add(5); // size > 4 → 丢弃

        pool.release(small);
        pool.release(atLimit);
        pool.release(overLimit);

        const p = poolInternals<number>(pool);
        assert.ok(p.idle.includes(small), "小 Set 应被复用");
        assert.ok(p.idle.includes(atLimit), "size == keepSizeLimit 的边界值应被复用");
        assert.ok(!p.idle.includes(overLimit), "超过 keepSizeLimit 应被丢弃");
        assert.equal(p.dropped, 1);
    });

    it("池中所有闲置 Set 都必须是空的；drain 后 idle 清空但计数保留", () => {
        const pool = new SetPool<number>(2, 100, 1024, 1);
        const sets = acquireMany(pool, 10);
        sets[0].add(7);
        releaseAll(pool, sets);

        const p = poolInternals<number>(pool);
        for (const s of p.idle) assert.equal(s.size, 0);

        const targetBefore = p.target;
        const outstandingBefore = p.outstanding;
        pool.drain();

        assert.equal(p.idle.length, 0, "drain 后不应有闲置 Set");
        assert.equal(p.target, targetBefore, "drain 不应改变 target");
        assert.equal(p.outstanding, outstandingBefore, "drain 不应改变 outstanding 计数");
    });

    it("多余的 release 不会让 outstanding 变成负数", () => {
        const pool = new SetPool<number>(2, 100, 1024, 4);
        pool.release(new Set());
        pool.release(new Set());

        assert.equal(poolInternals<number>(pool).outstanding, 0);
    });
});

describe("SetPool 自适应容量", () => {
    it("并发峰值上升时 target 立刻跟随（峰值驱动）", () => {
        const pool = new SetPool<number>(2, 1000, 1024, 4);
        const sets = acquireMany(pool, 100); // 无归还 → 并发 = 100

        const p = poolInternals<number>(pool);
        assert.equal(p.peak, 100);
        assert.equal(p.target, 100, "target 应贴住并发峰值");

        releaseAll(pool, sets);
        assert.equal(p.idle.length, 100, "target 足够时归还的桶应全部留住");
        assert.equal(p.dropped, 0);
    });

    it("target 受 maxIdle 钳制", () => {
        const pool = new SetPool<number>(2, 16, 1024, 4);
        acquireMany(pool, 100);

        const p = poolInternals<number>(pool);
        assert.equal(p.target, 16, "target 不得超过 maxIdle");
        assert.ok(p.peak > p.maxIdle, "峰值本身可以大于 maxIdle（只是 target 被钳制）");
    });

    it("target 永不低于 minIdle", () => {
        const pool = new SetPool<number>(8, 64, 1024, 1);
        for (let round = 0; round < 50; round++) {
            const sets = acquireMany(pool, 1);
            releaseAll(pool, sets);
            assert.ok(poolInternals<number>(pool).target >= 8, "target 不得低于 minIdle");
        }
    });

    it("下降是渐进的（滞回，不是一拍回到 minIdle）", () => {
        const pool = new SetPool<number>(2, 1000, 1024, 4);
        const hot = acquireMany(pool, 100);
        releaseAll(pool, hot);

        const p = poolInternals<number>(pool);
        assert.equal(p.target, 100);

        const history: number[] = [];
        for (let window = 0; window < 3; window++) {
            const sets = acquireMany(pool, 4); // 一个窗口
            releaseAll(pool, sets);
            history.push(p.target);
        }

        assert.ok(history[0] > 2, `第一个窗口后 target 仍应远高于 minIdle, 实际 ${history[0]}`);
        assert.ok(history[1] < history[0], `target 应逐步下降: ${history.join(" -> ")}`);
        assert.ok(history[2] < history[1], `target 应逐步下降: ${history.join(" -> ")}`);

        // 每次下降幅度不超过 1/8 + 1（渐进衰减, 不抖动）
        const steps = [100 - history[0], history[0] - history[1], history[1] - history[2]];
        for (const step of steps) {
            assert.ok(step <= Math.ceil(100 / 8) + 1, `单次下降幅度过大: ${step}`);
        }
    });

    it("长时间低负载后 target 收敛到 minIdle 并稳定", () => {
        const pool = new SetPool<number>(4, 1000, 1024, 4);
        const hot = acquireMany(pool, 200);
        releaseAll(pool, hot);

        for (let window = 0; window < 80; window++) {
            const sets = acquireMany(pool, 4);
            releaseAll(pool, sets);
        }

        assert.equal(poolInternals<number>(pool).target, 4, "最终应收敛到 minIdle");
    });

    it("负载高低交替时不会把池砍到 minIdle（抗抖动）", () => {
        const pool = new SetPool<number>(2, 1000, 1024, 4);

        for (let cycle = 0; cycle < 6; cycle++) {
            const hot = acquireMany(pool, 200);
            releaseAll(pool, hot);
            const cold = acquireMany(pool, 1);
            releaseAll(pool, cold);
        }

        assert.ok(poolInternals<number>(pool).target > 32, "交替负载下 target 不应被砍到底");
    });
});
