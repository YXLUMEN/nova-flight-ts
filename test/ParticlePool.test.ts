/**
 * ParticlePool 单元测试
 *
 * 被测对象是 src/effect/particle 下的现役实现：交错行 + 外挂列 + 两级属性门控。
 *
 * 两处边界做了替换，其余全部是真实代码：
 *   - ParticleSprite 被 mock：真实实现会走 OffscreenCanvas，node 环境没有。
 *     渲染逻辑本身（插值 / 收缩 / 旋转分支 / drawImage 参数）仍在被测路径上。
 *   - ParticleEffectType 用字面量构造：它的静态 PACKET_CODEC 会拉起注册表与网络编解码，
 *     而 spawnEffect 只读它的字段，两者行为等价。
 *
 * 行槽位与属性位在这里固化成数值字面量：验证的是"实现是否符合 ParticleAttr 声明的布局"，
 * 而不是照着实现的常量反推期望值。
 */

import {assert, beforeEach, describe, it, vi} from "vitest";
import type {ParticleEffectType} from "../src/effect/particle/ParticleEffectType.ts";
import type {ParticleShape} from "../src/effect/particle/ParticleShape.ts";
import type {ParticleStore} from "../src/effect/particle/ParticleStore.ts";
import {ParticlePool} from "../src/effect/particle/ParticlePool.ts";
import {ParticleGravitySystem} from "../src/effect/particle/system/ParticleGravitySystem.ts";

// ---------------------------------------------------------------- mock

const spriteState = vi.hoisted(() => ({
    calls: [] as Array<{ shape: number; size: number; c0: number; c1: number }>,
    clears: 0,
}));

vi.mock("../src/effect/particle/ParticleSprite.ts", () => ({
    ParticleSprite: class {
        public get(shape: number, size: number, c0: number, c1: number) {
            spriteState.calls.push({shape, size, c0, c1});
            return {shape, size, c0, c1};
        }

        public clear() {
            spriteState.clears++;
            spriteState.calls.length = 0;
        }
    },
}));

// ---------------------------------------------------------------- 布局常量

const ROW_SLOTS = 12;

/** 核心行槽位，与 ParticleAttr.P_IDX 一一对应 */
const P = {
    CX: 0, CY: 1, PX: 2, PY: 3,
    VX: 4, VY: 5,
    SIZE: 6, REC: 7,
    AGE: 8, LIFE: 9,
    C0: 10, C1: 11,
} as const;

const SHAPE_MASK = 0b111;

/** ParticleAttr 的编号 */
const ATTR_ROT = 0;
const ATTR_DRAG = 1;
const ATTR_GRAVITY = 2;

/** attrBit(attr) = 1 << (3 + attr) */
const BIT_ROT = 1 << 3;
const BIT_DRAG = 1 << 4;
const BIT_GRAVITY = 1 << 5;

/** ParticleShape */
const CIRCLE = 0;
const RECT = 1;
const TRIANGLE = 2;

const WHITE = 0xFFFFFFFF;

// ---------------------------------------------------------------- 工具

interface PoolInternals {
    store: ParticleStore;
}

/** store 是 private：测试直接穿透读内部布局 */
function storeOf(pool: ParticlePool): ParticleStore {
    return (pool as unknown as PoolInternals).store;
}

function makeCtx() {
    const calls: string[] = [];
    const draws: Array<{ sprite: unknown; dx: number; dy: number; w: number; h: number }> = [];

    const ctx = {
        save() {
            calls.push("save");
        },
        restore() {
            calls.push("restore");
        },
        translate(x: number, y: number) {
            calls.push(`translate(${x},${y})`);
        },
        rotate(a: number) {
            calls.push(`rotate(${a})`);
        },
        drawImage(sprite: unknown, dx: number, dy: number, w: number, h: number) {
            calls.push("drawImage");
            draws.push({sprite, dx, dy, w, h});
        },
    };

    return {ctx: ctx as unknown as CanvasRenderingContext2D, calls, draws};
}

/** spawnEffect 只读字段，构造一个等价的只读数据对象 */
function effectType(overrides: Partial<Record<keyof ParticleEffectType, unknown>> = {}): ParticleEffectType {
    return {
        lifeMin: 5,
        lifeMax: 5,
        recession: 0.6,
        sizeMin: 2,
        sizeMax: 2,
        shape: CIRCLE,
        colorFrom: WHITE,
        colorTo: WHITE,
        speedMin: 0,
        speedMax: 0,
        rotMin: 0,
        rotMax: 0,
        spreadMin: 0,
        spreadMax: 0,
        drag: 0,
        traits: null,
        ...overrides,
    } as unknown as ParticleEffectType;
}

beforeEach(() => {
    spriteState.calls.length = 0;
});

// ================================================================ 存储布局

describe("核心行布局", () => {
    it("单个 buffer 由 f32 / u32 双视图共享，行宽 12 槽", () => {
        const store = storeOf(new ParticlePool(8));

        assert.equal(store.cap, 8);
        assert.equal(store.f32.length, 8 * ROW_SLOTS);
        assert.equal(store.u32.length, 8 * ROW_SLOTS);
        assert.equal(store.meta.length, 8);
        assert.equal(store.f32.buffer, store.u32.buffer, "两个视图必须挂在同一块 ArrayBuffer 上");
        assert.equal(store.f32.byteLength, 8 * ROW_SLOTS * 4);
    });

    it("spawnResolve 按槽位写入，返回槽位下标", () => {
        const pool = new ParticlePool(8);
        const i = pool.spawnResolve(10, 20, 1, 2, 10, 3, RECT, 0xFF00FFFF, 0x00FF00FF, 0.5, 0.4, 1.2);
        const store = storeOf(pool);
        const b = i * ROW_SLOTS;

        assert.equal(i, 0);

        assert.closeTo(store.f32[b + P.CX], 10, 1e-4);
        assert.closeTo(store.f32[b + P.CY], 20, 1e-4);
        assert.closeTo(store.f32[b + P.VX], 1, 1e-4);
        assert.closeTo(store.f32[b + P.VY], 2, 1e-4);
        assert.closeTo(store.f32[b + P.SIZE], 3, 1e-4);
        assert.closeTo(store.f32[b + P.REC], 0.4, 1e-4);

        assert.equal(store.u32[b + P.AGE], 0, "age 从 0 开始");
        assert.equal(store.u32[b + P.LIFE], 10);
        assert.equal(store.u32[b + P.C0], 0xFF00FFFF);
        assert.equal(store.u32[b + P.C1], 0x00FF00FF);
    });

    it("px / py 初始化为出生点（首帧插值不产生位移）", () => {
        const pool = new ParticlePool(4);
        const i = pool.spawnResolve(7, -3, 5, 5, 10, 1, CIRCLE, WHITE);
        const store = storeOf(pool);
        const b = i * ROW_SLOTS;

        assert.equal(store.f32[b + P.PX], 7);
        assert.equal(store.f32[b + P.PY], -3);
    });

    it("shape 落在 meta 低 3 位，属性位从第 4 位起", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);

        pool.spawnResolve(0, 0, 0, 0, 10, 1, CIRCLE, WHITE);
        pool.spawnResolve(0, 0, 0, 0, 10, 1, RECT, WHITE);
        pool.spawnResolve(0, 0, 0, 0, 10, 1, TRIANGLE, WHITE);

        assert.equal(store.meta[0], 0);
        assert.equal(store.meta[1], 1);
        assert.equal(store.meta[2], 2);
        for (let i = 0; i < 3; i++) assert.equal(store.meta[i] & ~SHAPE_MASK, 0, "无属性时高位必须为 0");
    });

    it("池满时返回 -1，且不覆盖已有粒子", () => {
        const pool = new ParticlePool(1);
        const store = storeOf(pool);

        assert.equal(pool.spawnResolve(1, 1, 0, 0, 10, 1, CIRCLE, WHITE), 0);
        assert.equal(pool.spawnResolve(2, 2, 0, 0, 10, 1, CIRCLE, WHITE), -1);
        assert.equal(store.active, 1);
        assert.closeTo(store.f32[P.CX], 1, 1e-6);
    });

    it("shape 越界降级为 RECT，不抛异常也不污染属性位", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);

        // 模拟网络包传入的畸形 shape：类型上不存在，运行期必须被兜住
        const tooBig = 8 as unknown as ParticleShape;
        const negative = -1 as unknown as ParticleShape;

        assert.equal(pool.spawnResolve(0, 0, 0, 0, 10, 1, tooBig, WHITE), 0, "越界仍生成粒子");
        assert.equal(store.meta[0], RECT);

        assert.equal(pool.spawnResolve(0, 0, 0, 0, 10, 1, negative, WHITE), 1, "负数仍生成粒子");
        assert.equal(store.meta[1], RECT);

        assert.equal(store.verifyAccounting(), null);
    });
});

// ================================================================ 外挂列

describe("外挂属性（值型 / 标记型）", () => {
    it("非 0 的 rot / drag 会置位并写入对应列", () => {
        const pool = new ParticlePool(8);
        const i = pool.spawnResolve(0, 0, 0, 0, 10, 1, TRIANGLE, WHITE, WHITE, 0.5, 0.6, 1.2);
        const store = storeOf(pool);

        assert.equal(store.meta[i], TRIANGLE | BIT_ROT | BIT_DRAG);
        assert.equal(store.mask, BIT_ROT | BIT_DRAG);
        assert.closeTo(store.read(i, ATTR_ROT), 1.2, 1e-6);
        assert.closeTo(store.read(i, ATTR_DRAG), 0.5, 1e-6);
        assert.equal(store.countOf(ATTR_ROT), 1);
        assert.equal(store.countOf(ATTR_DRAG), 1);
    });

    it("取默认值的属性不置位，且整列都不分配", () => {
        const pool = new ParticlePool(8);
        pool.spawnResolve(0, 0, 0, 0, 10, 1, CIRCLE, WHITE);
        const store = storeOf(pool);

        assert.equal(store.meta[0], CIRCLE);
        assert.equal(store.mask, 0, "池级 mask 为 0：整段可选逻辑可以跳过");
        assert.isNull(store.peek(ATTR_ROT), "rot 列未分配");
        assert.isNull(store.peek(ATTR_DRAG), "drag 列未分配");
    });

    it("重复 attach 不会让持有点数翻倍", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);
        const i = pool.spawnResolve(0, 0, 0, 0, 10, 1, CIRCLE, WHITE);

        store.attach(i, ATTR_DRAG, 1.5);
        store.attach(i, ATTR_DRAG, 2.5);

        assert.equal(store.countOf(ATTR_DRAG), 1);
        assert.closeTo(store.read(i, ATTR_DRAG), 2.5, 1e-6, "后写的值覆盖先写的");
        assert.equal(store.mask, BIT_DRAG);
    });

    it("tag 是标记型：置位但不分配数据列", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);
        const i = pool.spawnResolve(0, 0, 0, 0, 10, 1, CIRCLE, WHITE);

        store.tag(i, ATTR_GRAVITY);

        assert.equal(store.meta[i] & BIT_GRAVITY, BIT_GRAVITY);
        assert.equal(store.mask, BIT_GRAVITY);
        assert.isNull(store.peek(ATTR_GRAVITY), "标记型属性没有列");
        assert.equal(store.read(i, ATTR_GRAVITY), 0, "无列时读回 0");
    });

    it("detach 销账到 0 时池级 mask 归零；未持有则空操作", () => {
        const pool = new ParticlePool(4);
        const i = pool.spawnResolve(0, 0, 0, 0, 10, 1, TRIANGLE, WHITE, WHITE, 0, 0.6, 1);
        const store = storeOf(pool);

        store.detach(i, ATTR_ROT);
        assert.equal(store.countOf(ATTR_ROT), 0);
        assert.equal(store.mask, 0);
        assert.equal(store.read(i, ATTR_ROT), 0, "位清了就读不到，哪怕列里还有旧值");

        store.detach(i, ATTR_ROT);
        assert.equal(store.countOf(ATTR_ROT), 0, "重复 detach 不得把计数打成负数");
        assert.equal(store.verifyAccounting(), null);
    });

    it("verifyAccounting 能发现手工改 meta 造成的记账漂移", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 10, 1, CIRCLE, WHITE);
        const store = storeOf(pool);

        assert.equal(store.verifyAccounting(), null);
        store.meta[0] |= BIT_ROT;
        assert.isString(store.verifyAccounting(), "只改 meta 不记账，校验应报错");
    });
});

// ================================================================ tick

describe("tick：寿命 / 阻尼 / 积分（integrate 按 tick 推进，不乘 dt）", () => {
    it("每个存活粒子每帧只推进一格 age", () => {
        const pool = new ParticlePool(4);
        for (let i = 0; i < 3; i++) pool.spawnResolve(0, 0, 0, 0, 100, 1, CIRCLE, WHITE);
        const store = storeOf(pool);

        pool.tick(0.05);
        pool.tick(0.05);
        pool.tick(0.05);

        for (let i = 0; i < 3; i++) assert.equal(store.u32[i * ROW_SLOTS + P.AGE], 3);
    });

    it("有阻尼时速度先衰减再积分，px/py 保留上一帧位置", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(10, 20, 1, 2, 10, 3, CIRCLE, WHITE, WHITE, 0.5);

        pool.tick(0.5);
        const store = storeOf(pool);
        const b = 0;

        assert.equal(store.u32[b + P.AGE], 1);
        assert.closeTo(store.f32[b + P.VX], 0.5, 1e-6, "vx = 1 * (1 - 0.5)");
        assert.closeTo(store.f32[b + P.VY], 1, 1e-6, "vy = 2 * 0.5");
        assert.closeTo(store.f32[b + P.PX], 10, 1e-6, "px 是上一帧的 cx");
        assert.closeTo(store.f32[b + P.CX], 10.5, 1e-6, "cx = 10 + 0.5");
        assert.closeTo(store.f32[b + P.CY], 21, 1e-6, "cy = 20 + 1");
    });

    it("无阻尼时不衰减", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(10, 20, 1, 2, 10, 3, CIRCLE, WHITE);

        pool.tick(0.5);
        const store = storeOf(pool);

        assert.closeTo(store.f32[P.VX], 1, 1e-6);
        assert.closeTo(store.f32[P.CX], 11, 1e-6, "cx = 10 + vx，一 tick 一步");
    });

    it("age 达到 life 的粒子在当帧被移除", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 1, 1, CIRCLE, WHITE);
        const store = storeOf(pool);

        pool.tick(0.05);
        assert.equal(store.active, 0);
    });
});

describe("tick：swap-remove 搬运", () => {
    it("末尾粒子顶替空洞时，核心行 / meta / 外挂列一起搬家", () => {
        const pool = new ParticlePool(8);
        pool.spawnResolve(1, 1, 0, 0, 1, 1, CIRCLE, WHITE);                          // 0 号：马上死
        pool.spawnResolve(2, 2, 0, 0, 100, 1, CIRCLE, WHITE);                        // 1 号
        pool.spawnResolve(3, 3, 0, 0, 100, 1, TRIANGLE, WHITE, WHITE, 0, 0.6, 0.7);  // 2 号：带 rot
        const store = storeOf(pool);

        assert.equal(store.mask, BIT_ROT);

        pool.tick(0.05);

        assert.equal(store.active, 2);
        assert.closeTo(store.f32[P.CX], 3, 1e-6, "2 号搬到 0 号槽");
        assert.equal(store.meta[0], TRIANGLE | BIT_ROT, "meta 跟着搬");
        assert.equal(store.meta[1], CIRCLE, "1 号不受影响");
        assert.closeTo(store.read(0, ATTR_ROT), 0.7, 1e-6, "rot 值跟着搬");
        assert.equal(store.countOf(ATTR_ROT), 1, "搬运不改变持有点数");
        assert.equal(store.verifyAccounting(), null);
    });

    it("被搬到空洞里的粒子本帧不会被重复推进 age", () => {
        const pool = new ParticlePool(8);
        pool.spawnResolve(0, 0, 0, 0, 1, 1, CIRCLE, WHITE);     // 0 号：本帧死亡
        pool.spawnResolve(0, 0, 0, 0, 100, 1, CIRCLE, WHITE);   // 1 号
        pool.spawnResolve(0, 0, 0, 0, 100, 1, CIRCLE, WHITE);   // 2 号：搬到 0 号槽
        const store = storeOf(pool);

        pool.tick(0.05);

        assert.equal(store.u32[P.AGE], 1, "顶替者本帧只应推进一次");
        assert.equal(store.u32[ROW_SLOTS + P.AGE], 1);
    });

    it("最后一个粒子死亡（index === last）时池级 mask 也要归零", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 1, 1, TRIANGLE, WHITE, WHITE, 0, 0.6, 1.5);
        const store = storeOf(pool);

        assert.equal(store.mask, BIT_ROT);
        pool.tick(0.05);

        assert.equal(store.active, 0);
        assert.equal(store.mask, 0);
        assert.equal(store.verifyAccounting(), null);
    });
});

// ================================================================ system

describe("system 调度与池级门控", () => {
    it("没有粒子持有该位时，system 完全不被调用", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);
        pool.spawnResolve(0, 0, 0, 0, 100, 1, CIRCLE, WHITE);

        let calls = 0;
        pool.registerSystem({bit: BIT_GRAVITY, tick: () => void calls++});

        pool.tick(0.1);
        assert.equal(calls, 0, "池级 mask 为 0，整段跳过");

        store.tag(0, ATTR_GRAVITY);
        pool.tick(0.1);
        assert.equal(calls, 1, "有粒子持有时才调度");
    });

    it("GravitySystem 只影响带 GRAVITY 位的粒子", () => {
        const pool = new ParticlePool(8);
        const store = storeOf(pool);
        const plain = pool.spawnResolve(0, 0, 0, 0, 100, 1, CIRCLE, WHITE);
        const heavy = pool.spawnResolve(0, 0, 0, 0, 100, 1, CIRCLE, WHITE);
        store.tag(heavy, ATTR_GRAVITY);
        pool.registerSystem(new ParticleGravitySystem(0, 100));

        pool.tick(0.1);

        assert.closeTo(store.f32[plain * ROW_SLOTS + P.VY], 0, 1e-6);
        assert.closeTo(store.f32[heavy * ROW_SLOTS + P.VY], 100, 1e-6, "vy += 100（每 tick 固定增量，dt 不参与）");
    });

    it("unregisterSystem 后不再生效（粒子上的位仍然保留）", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);
        const i = pool.spawnResolve(0, 0, 0, 0, 100, 1, CIRCLE, WHITE);
        store.tag(i, ATTR_GRAVITY);
        const gravity = new ParticleGravitySystem(0, 100);
        pool.registerSystem(gravity);

        pool.tick(0.1);
        assert.closeTo(store.f32[i * ROW_SLOTS + P.VY], 100, 1e-6);

        pool.unregisterSystem(gravity);
        pool.tick(0.1);

        assert.closeTo(store.f32[i * ROW_SLOTS + P.VY], 100, 1e-6, "速度不再增加");
        assert.equal(store.meta[i] & BIT_GRAVITY, BIT_GRAVITY);
    });
});

// ================================================================ spawnEffect

describe("spawnEffect 批量发射", () => {
    it("按剩余容量截断，不覆盖已有粒子", () => {
        const pool = new ParticlePool(16);
        const store = storeOf(pool);

        pool.spawn(effectType(), 0, 0, 100);
        assert.equal(store.active, 16);
    });

    it("count <= 0 时不生成", () => {
        const pool = new ParticlePool(8);
        pool.spawn(effectType(), 0, 0, 0);
        pool.spawn(effectType(), 0, 0, -3);
        assert.equal(storeOf(pool).active, 0);
    });

    it("整批共享出生点、寿命与尺寸", () => {
        const pool = new ParticlePool(8);
        const store = storeOf(pool);

        pool.spawn(effectType({lifeMin: 5, lifeMax: 5, sizeMin: 2, sizeMax: 2}), 3, 4, 4);

        assert.equal(store.active, 4);
        for (let i = 0; i < 4; i++) {
            const b = i * ROW_SLOTS;
            assert.closeTo(store.f32[b + P.CX], 3, 1e-6);
            assert.closeTo(store.f32[b + P.CY], 4, 1e-6);
            assert.closeTo(store.f32[b + P.SIZE], 2, 1e-6);
            assert.equal(store.u32[b + P.LIFE], 5);
            assert.equal(store.u32[b + P.AGE], 0);
        }
    });

    it("圆形特效即使配了 rotation 也不会产生 rot 属性", () => {
        const pool = new ParticlePool(8);
        const store = storeOf(pool);

        pool.spawn(effectType({shape: CIRCLE, rotMin: 1, rotMax: 2}), 0, 0, 4);

        assert.equal(store.mask, 0);
        assert.isNull(store.peek(ATTR_ROT), "圆不需要 rot 列");
    });

    it("非圆特效按 rotation 范围写入 rot", () => {
        const pool = new ParticlePool(8);
        const store = storeOf(pool);

        pool.spawn(effectType({shape: TRIANGLE, rotMin: 0.3, rotMax: 0.3}), 0, 0, 4);

        assert.equal(store.mask, BIT_ROT);
        for (let i = 0; i < 4; i++) {
            assert.equal(store.meta[i] & BIT_ROT, BIT_ROT);
            assert.closeTo(store.read(i, ATTR_ROT), 0.3, 1e-6);
        }
    });

    it("traits 透传到外挂列", () => {
        const pool = new ParticlePool(8);
        const store = storeOf(pool);

        pool.spawn(effectType({traits: [{attr: ATTR_DRAG, value: 2.5}]}), 0, 0, 3, 0);

        assert.equal(store.mask, BIT_DRAG);
        assert.equal(store.countOf(ATTR_DRAG), 3);
        for (let i = 0; i < 3; i++) {
            assert.closeTo(store.read(i, ATTR_DRAG), 2.5, 1e-6);
        }
    });

    it("life <= 0 的粒子被丢弃，不占槽位", () => {
        const pool = new ParticlePool(8);
        const store = storeOf(pool);

        assert.equal(pool.spawnResolve(0, 0, 0, 0, 0, 1, CIRCLE, WHITE), -1);
        assert.equal(store.active, 0);
        assert.equal(store.mask, 0);
    });
});

// ================================================================ spawn

describe("spawn：颜色编码", () => {
    it("#RRGGBB 补满 alpha 后写入 C0/C1", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);

        const i = pool.spawnRaw(0, 0, 0, 0, 10, 1, CIRCLE, "#ff0000");
        assert.equal(store.u32[i * ROW_SLOTS + P.C0], 0xFF0000FF);
        assert.equal(store.u32[i * ROW_SLOTS + P.C1], 0xFF0000FF, "colorTo 默认等于 colorFrom");
    });

    it("#RGB 与 #RRGGBBAA 都支持", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);

        const i = pool.spawnRaw(0, 0, 0, 0, 10, 1, CIRCLE, "#f00", "#00ff0080");
        assert.equal(store.u32[i * ROW_SLOTS + P.C0], 0xFF0000FF);
        assert.equal(store.u32[i * ROW_SLOTS + P.C1], 0x00FF0080);
    });

    it("非法颜色串抛出（4 位既不是 #RGB 也不是 #RRGGBB）", () => {
        const pool = new ParticlePool(4);
        assert.throws(() => pool.spawnRaw(0, 0, 0, 0, 10, 1, CIRCLE, "#FFFF"));
    });
});

// ================================================================ render

describe("render：插值 / 收缩 / 旋转门控", () => {
    it("按 alpha 在 px→cx 之间插值，并以 size*2 绘制", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(10, 20, 1, 0, 10, 3, CIRCLE, 0xFFFF00FF, 0xFF00FFFF, 0, 0);
        pool.tick(0.5);

        const {ctx, calls, draws} = makeCtx();
        pool.render(ctx, 0.5);

        assert.deepEqual(calls, ["drawImage"]);
        assert.equal(draws.length, 1);
        // 一 tick 后 cx = 11、px = 10；x = lerp(0.5, 10, 11) = 10.5，左上角 = x - size
        assert.closeTo(draws[0].dx, 10.5 - 3, 1e-6);
        assert.closeTo(draws[0].dy, 20 - 3, 1e-6);
        assert.closeTo(draws[0].w, 6, 1e-6);
        assert.closeTo(draws[0].h, 6, 1e-6);

        assert.equal(spriteState.calls.length, 1);
        assert.equal(spriteState.calls[0].shape, CIRCLE);
        assert.closeTo(spriteState.calls[0].size, 3, 1e-6);
        assert.equal(spriteState.calls[0].c0, 0xFFFF00FF);
        assert.equal(spriteState.calls[0].c1, 0xFF00FFFF);
    });

    it("size 随 recession 收缩", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 2, 10, CIRCLE, WHITE, WHITE, 0, 0.5);
        pool.tick(0.05);   // age = 1, k = 0.5 → 10 * (1 - 0.5*0.5) = 7.5

        const {ctx} = makeCtx();
        pool.render(ctx, 0);

        assert.closeTo(spriteState.calls[0].size, 7.5, 1e-6);
    });

    it("半尺寸小于 0.1 的粒子被跳过", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 10, 0.05, CIRCLE, WHITE, WHITE, 0, 0);

        const {ctx, calls} = makeCtx();
        pool.render(ctx, 0);

        assert.deepEqual(calls, []);
        assert.equal(spriteState.calls.length, 0, "连贴图都不查");
    });

    it("没有旋转粒子时不进入 save/rotate 分支", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 10, 2, CIRCLE, WHITE);
        pool.spawnResolve(0, 0, 0, 0, 10, 2, TRIANGLE, WHITE, WHITE, 0, 0.6, 0);   // 非圆但 rot=0

        const {ctx, calls} = makeCtx();
        pool.render(ctx, 0);

        assert.deepEqual(calls, ["drawImage", "drawImage"]);
    });

    it("有旋转粒子时走 save/translate/rotate/drawImage/restore", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 10, 2, TRIANGLE, WHITE, WHITE, 0, 0, 0.5);

        const {ctx, calls, draws} = makeCtx();
        pool.render(ctx, 0);

        assert.deepEqual(calls, ["save", "translate(0,0)", "rotate(0.5)", "drawImage", "restore"]);
        assert.closeTo(draws[0].dx, -2, 1e-6, "旋转路径以 (0,0) 为中心绘制");
        assert.closeTo(draws[0].dy, -2, 1e-6);
    });

    it("只有 ROT 标记位、没有 rot 列时走直通路径（不崩）", () => {
        const pool = new ParticlePool(4);
        const store = storeOf(pool);
        const i = pool.spawnResolve(0, 0, 0, 0, 10, 2, TRIANGLE, WHITE);
        store.tag(i, ATTR_ROT);

        assert.equal(store.mask, BIT_ROT, "池级位是亮的");
        assert.isNull(store.peek(ATTR_ROT), "但没有列");

        const {ctx, calls} = makeCtx();
        pool.render(ctx, 0);

        assert.deepEqual(calls, ["drawImage"], "门控位退化为 0，安全直通");
    });

    it("空池直接返回", () => {
        const pool = new ParticlePool(4);
        const {ctx, calls} = makeCtx();
        pool.render(ctx, 0.5);
        assert.deepEqual(calls, []);
    });
});

// ================================================================ reset

describe("reset / clearCache", () => {
    it("reset 清空活跃数与记账，但保留已分配的列", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 10, 1, TRIANGLE, WHITE, WHITE, 1, 0.6, 1);
        const store = storeOf(pool);

        assert.notEqual(store.mask, 0);
        pool.reset();

        assert.equal(store.active, 0);
        assert.equal(store.mask, 0);
        assert.equal(store.countOf(ATTR_ROT), 0);
        assert.equal(store.countOf(ATTR_DRAG), 0);
        assert.equal(store.verifyAccounting(), null);
        assert.isNotNull(store.peek(ATTR_ROT), "列脏数据保留，只是读不到");
    });

    it("reset 后复用槽位不会继承旧的 meta 位", () => {
        const pool = new ParticlePool(4);
        pool.spawnResolve(0, 0, 0, 0, 10, 1, TRIANGLE, WHITE, WHITE, 0, 0.6, 1);
        pool.reset();

        const i = pool.spawnResolve(0, 0, 0, 0, 10, 1, CIRCLE, WHITE);
        const store = storeOf(pool);

        assert.equal(i, 0);
        assert.equal(store.meta[0], CIRCLE, "旧 shape 与旧属性位都必须被覆盖");
        assert.equal(store.mask, 0);
        assert.equal(store.verifyAccounting(), null);
    });

    it("clearCache 清空贴图缓存", () => {
        const pool = new ParticlePool(4);
        const before = spriteState.clears;

        pool.clearCache();
        assert.equal(spriteState.clears, before + 1);
    });
});
