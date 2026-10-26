/**
 * StarField 布局、重播种与渲染测试。
 *
 * 星空没有世界实体，所有状态压在一行的 core 里（X / Y / 速度 / 半径），
 * 这里验证三件事：
 * 1. 数量分配：固定数优先，余量按权重分配，取整误差补到前层
 * 2. 重播种：边界必须按"层空间"算 —— 基础偏移是 cameraOffset * parallax，
 *    震动偏移是 shake * shakeFactor（不是 shake * parallax），垂直方向要双向环绕
 *
 * 时间相关的断言都用固定 dt 和 alpha 的两个端点(1 / 0)，不依赖真实计时。
 */
import {afterEach, assert, beforeEach, describe, it, vi} from "vitest";
import type {StarLayer} from "../src/type/IStarLayer.ts";
import type {Camera} from "../src/client/render/Camera.ts";
import {StarField} from "../src/effect/StarField.ts";
import {World} from "../src/world/World.ts";

// 这里按 ParticleSprite 的做法只保留这两个常量，避免把整个实体图拖进单测。
vi.mock("../src/world/World.ts", () => ({
    World: {MAP_WIDTH: 1760, MAP_HEIGHT: 1120},
}));

// ---------------------------------------------------------------- 布局常量

/** 核心行槽位，顺序与 StarField 内部的 StarIdx 一致 */
const S = {X: 0, Y: 1, SPEED: 2, RADIUS: 3} as const;
const ROW_SLOTS = 4;

/** 常用视口与边距 */
const W = 1280;
const H = 720;
const M = 8;

// ---------------------------------------------------------------- 工具

interface FieldInternals {
    readonly core: Float32Array;
    readonly count: number;
    readonly start: Uint16Array;
    readonly end: Uint16Array;
}

/** core / start / end 都是 private：测试直接穿透读内部布局 */
function internals(field: StarField): FieldInternals {
    return field as unknown as FieldInternals;
}

function counts(field: StarField): number[] {
    const f = internals(field);
    const out: number[] = [];
    for (let li = 0; li < f.start.length; li++) out.push(f.end[li] - f.start[li]);
    return out;
}

/** 只提供 StarField 会读的四个字段，避免测试拉起真实的 ClientWindow / DOM */
interface CameraHandle {
    readonly cam: Camera;

    /** 模拟一帧的相机状态；shake 是震动偏移（含在 viewOffset 里，不含在 cameraOffset 里） */
    move(x: number, y: number, shakeX?: number, shakeY?: number): void;
}

function makeCamera(w: number = W, h: number = H): CameraHandle {
    const base = {x: 0, y: 0};
    const view = {x: 0, y: 0};
    const rect = {left: 0, top: 0, right: 0, bottom: 0, width: w, height: h};

    const cam = {
        cameraOffset: base,
        viewOffset: view,
        lastViewOffset: view,
        viewRect: rect,
    } as unknown as Camera;

    const move = (x: number, y: number, shakeX = 0, shakeY = 0) => {
        base.x = x;
        base.y = y;
        view.x = x + shakeX;
        view.y = y + shakeY;
        rect.left = view.x;
        rect.top = view.y;
        rect.right = view.x + w;
        rect.bottom = view.y + h;
    };
    move(0, 0);

    return {cam, move};
}

/** 某层在"层空间"里的可见矩形，由屏幕位置 = 位置 - base*parallax + shake*shakeFactor 反推 */
function layerBand(l: StarLayer, cam: Camera) {
    const shakeX = cam.viewOffset.x - cam.cameraOffset.x;
    const shakeY = cam.viewOffset.y - cam.cameraOffset.y;
    const left = cam.cameraOffset.x * l.parallax - shakeX * l.shakeFactor;
    const top = cam.cameraOffset.y * l.parallax - shakeY * l.shakeFactor;
    return {left, top, right: left + cam.viewRect.width, bottom: top + cam.viewRect.height};
}

/** 返回首个越界的星（没有则 null）。逐星 assert 太吵，按帧一次性报错。 */
function firstViolation(field: StarField, cam: Camera, layers: readonly StarLayer[], margin: number): string | null {
    const f = internals(field);
    for (let li = 0; li < layers.length; li++) {
        const band = layerBand(layers[li], cam);
        for (let i = f.start[li]; i < f.end[li]; i++) {
            const b = i * ROW_SLOTS;
            const x = f.core[b + S.X];
            const y = f.core[b + S.Y];
            if (x < band.left - margin - 1e-3 || x > band.right + margin + 1e-3) {
                return `层${li} #${i} x=${x.toFixed(3)} 越出 [${band.left.toFixed(3)}, ${band.right.toFixed(3)}]`;
            }
            if (y < band.top - margin - 1e-3 || y > band.bottom + margin + 1e-3) {
                return `层${li} #${i} y=${y.toFixed(3)} 越出 [${band.top.toFixed(3)}, ${band.bottom.toFixed(3)}]`;
            }
        }
    }
    return null;
}

interface StarState {
    x: number;
    y: number;
    speed: number;
    radius: number;
}

function writeStar(field: StarField, index: number, star: StarState): void {
    const b = index * ROW_SLOTS;
    const core = internals(field).core;
    core[b + S.X] = star.x;
    core[b + S.Y] = star.y;
    core[b + S.SPEED] = star.speed;
    core[b + S.RADIUS] = star.radius;
}

function readStar(field: StarField, index: number): StarState {
    const b = index * ROW_SLOTS;
    const core = internals(field).core;
    return {
        x: core[b + S.X],
        y: core[b + S.Y],
        speed: core[b + S.SPEED],
        radius: core[b + S.RADIUS],
    };
}

/** 测试用的层配置：默认单层、视差 1、无震动、恒定速度 */
function layer(overrides: Partial<StarLayer> = {}): StarLayer {
    return {
        radiusMin: 0.5,
        radiusMax: 1,
        speedMin: 10,
        speedMax: 20,
        shakeFactor: 0,
        parallax: 1,
        ...overrides,
    } as StarLayer;
}

/** 线性同余 + Math.random 打桩，让重播种结果可复现 */
function seedRandom(initial: number): () => number {
    let state = (initial >>> 0) || 1;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

beforeEach(() => {
    vi.spyOn(Math, "random").mockImplementation(seedRandom(0x5f3a91));
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ================================================================ 数量分配

describe("数量分配与分段布局", () => {
    it("固定数优先，余量按权重分给各层，总数等于 totalCount", () => {
        const field = new StarField(100, [
            layer({count: 10, weight: 1}),
            layer({count: 20, weight: 3}),
        ]);

        assert.strictEqual(internals(field).count, 100);
        // 余量 70 按 1:3 分成 17 / 52，剩 1 补到前层
        assert.deepStrictEqual(counts(field), [28, 72]);
    });

    it("只给权重时按比例均分", () => {
        const field = new StarField(60, [
            layer({weight: 1}),
            layer({weight: 1}),
        ]);

        assert.deepStrictEqual(counts(field), [30, 30]);
    });

    it("取整误差向前层补齐，一颗星都不丢", () => {
        const field = new StarField(10, [
            layer({weight: 1}),
            layer({weight: 1}),
            layer({weight: 1}),
        ]);

        // 每层 3 颗，剩 1 颗补到第 0 层
        assert.deepStrictEqual(counts(field), [4, 3, 3]);
    });

    it("固定数之和超过 totalCount 时只保留固定数", () => {
        const field = new StarField(10, [
            layer({count: 8}),
            layer({count: 5}),
        ]);

        assert.deepStrictEqual(counts(field), [8, 5]);
        assert.strictEqual(internals(field).count, 13, "固定数可以把总数撑破，权重只分余量");
    });

    it("core 行宽 4，start / end 连续覆盖全部星", () => {
        const field = new StarField(37, [
            layer({count: 3}),
            layer({weight: 1}),
            layer({weight: 2}),
        ]);
        const f = internals(field);

        assert.strictEqual(f.core.length, f.count * ROW_SLOTS);
        assert.strictEqual(f.core.buffer instanceof ArrayBuffer, true);
        assert.strictEqual(f.start[0], 0);
        assert.strictEqual(f.start[1], f.end[0]);
        assert.strictEqual(f.start[2], f.end[1]);
        assert.strictEqual(f.end[2], f.count);
        assert.strictEqual(f.count, 37);
    });
});

// ================================================================ 初始化

describe("初始化播种", () => {
    it("没有相机时按整张地图撒点", () => {
        const field = new StarField(200, [layer({count: 200})], M);
        field.init();

        const f = internals(field);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = f.start[0]; i < f.end[0]; i++) {
            const {x, y} = readStar(field, i);
            assert.ok(x >= 0 && x <= World.MAP_WIDTH, `x=${x} 应落在地图宽度内`);
            assert.ok(y >= 0 && y <= World.MAP_HEIGHT, `y=${y} 应落在地图高度内`);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        // 200 颗星应铺开在整个地图上，而不是挤在一角
        assert.ok(maxX - minX > World.MAP_WIDTH * 0.5, "横向应覆盖大半张地图");
        assert.ok(maxY - minY > World.MAP_HEIGHT * 0.5, "纵向应覆盖大半张地图");
    });

    it("有相机时每层落在自己的层带内，开局不缺星", () => {
        const layers = [
            layer({count: 50, parallax: 0.8}),
            layer({count: 50, parallax: 0.08}),
        ];
        const field = new StarField(100, layers, M);
        const {cam, move} = makeCamera();
        move(320, 180);

        field.init(cam);

        assert.strictEqual(firstViolation(field, cam, layers, 0), null, "播种就该正好落在层带内");
    });

    it("相机还没有视口尺寸时退回全图撒点", () => {
        // StartScreenStarfield 的首个 init 发生在 tempCamera.tick 之前，viewRect 全是 0
        const field = new StarField(100, [layer({count: 100})], M);
        const {cam} = makeCamera(0, 0);

        field.init(cam);

        const f = internals(field);
        for (let i = f.start[0]; i < f.end[0]; i++) {
            const {x, y} = readStar(field, i);
            assert.ok(x >= 0 && x <= World.MAP_WIDTH);
            assert.ok(y >= 0 && y <= World.MAP_HEIGHT);
        }
    });
});

// ================================================================ 重播种边界

describe("重播种边界", () => {
    it("长距离飞行后每层星都还在自己的层带内", () => {
        const layers = [
            layer({
                count: 40,
                parallax: 0.8,
                shakeFactor: 0.9,
                speedMin: 50,
                speedMax: 85,
                radiusMin: 1.4,
                radiusMax: 2.2
            }),
            layer({
                count: 80,
                parallax: 0.5,
                shakeFactor: 0.3,
                speedMin: 20,
                speedMax: 40,
                radiusMin: 0.7,
                radiusMax: 1.2
            }),
            layer({count: 120, parallax: 0.08, shakeFactor: 0, speedMin: 10, speedMax: 25}),
        ];
        const field = new StarField(240, layers, M);
        const {cam, move} = makeCamera();
        field.init(cam);

        // 相机在整图范围内来回横跳，覆盖向右下 / 向左上两种飞行方向
        const dt = 1 / 60;
        let x = 0, y = 0, vx = 620, vy = 430;
        for (let frame = 0; frame < 600; frame++) {
            x += vx * dt;
            y += vy * dt;
            if (x <= 0) {
                x = 0;
                vx = -vx;
            }
            if (x >= World.MAP_WIDTH - W) {
                x = World.MAP_WIDTH - W;
                vx = -vx;
            }
            if (y <= 0) {
                y = 0;
                vy = -vy;
            }
            if (y >= World.MAP_HEIGHT - H) {
                y = World.MAP_HEIGHT - H;
                vy = -vy;
            }

            move(x, y);
            field.update(dt, cam);

            const violation = firstViolation(field, cam, layers, M);
            if (violation !== null) assert.fail(`第 ${frame} 帧 (cam=${x.toFixed(1)},${y.toFixed(1)}): ${violation}`);
        }
    });

    it("视差层不会因为飞行被整体推出屏幕", () => {
        // 回归：曾用 viewRect 播种，远层最多被推离屏幕 30%+
        const l = layer({count: 200, parallax: 0.08});
        const field = new StarField(200, [l], M);
        const {cam, move} = makeCamera();
        field.init(cam);

        move(400, 300);
        field.update(1 / 60, cam);

        const band = layerBand(l, cam);
        const f = internals(field);
        for (let i = f.start[0]; i < f.end[0]; i++) {
            const x = readStar(field, i).x;
            assert.ok(
                x >= band.left - M && x <= band.right + M,
                `x=${x.toFixed(2)} 应落在层带 [${band.left.toFixed(2)}, ${band.right.toFixed(2)}] 内`,
            );
        }
    });

    it("越过下边界从上方回来，同时刷新速度与半径", () => {
        const l = layer({count: 1, speedMin: 40, speedMax: 45, radiusMin: 3, radiusMax: 3.1});
        const field = new StarField(1, [l], M);
        const {cam} = makeCamera();

        writeStar(field, 0, {x: 640, y: H + M + 1, speed: 10, radius: 0.5});
        field.update(0, cam);

        const star = readStar(field, 0);
        assert.strictEqual(star.y, -M, "应回到上边界外侧 margin 处");
        assert.ok(star.x >= 0 && star.x <= W, "x 应重新落在层带内");
        assert.ok(star.speed >= 40 && star.speed <= 45, "速度应取自该层范围");
        assert.ok(star.radius > 2.99 && star.radius < 3.11, "半径应取自该层范围");
    });

    it("越过上边界从下方回来（相机向上飞时不能把星甩在带外）", () => {
        const field = new StarField(1, [layer({count: 1})], M);
        const {cam} = makeCamera();

        writeStar(field, 0, {x: 640, y: -M - 1, speed: 10, radius: 0.5});
        field.update(0, cam);

        assert.strictEqual(readStar(field, 0).y, H + M);
    });

    it("越过左 / 右边界在层带内水平环绕", () => {
        const field = new StarField(2, [layer({count: 2})], M);
        const {cam} = makeCamera();

        writeStar(field, 0, {x: -M - 1, y: 360, speed: 10, radius: 0.5});
        writeStar(field, 1, {x: W + M + 1, y: 360, speed: 10, radius: 0.5});
        field.update(0, cam);

        assert.strictEqual(readStar(field, 0).x, W + M, "从左边出去要从右边回来");
        assert.strictEqual(readStar(field, 1).x, -M, "从右边出去要从左边回来");
    });

    it("刚好停在 margin 内的星不重播种", () => {
        const field = new StarField(1, [layer({count: 1})], M);
        const {cam} = makeCamera();

        writeStar(field, 0, {x: -M, y: -M, speed: 0, radius: 0.5});
        field.update(0, cam);

        const star = readStar(field, 0);
        assert.strictEqual(star.x, -M, "边界上不算越界");
        assert.strictEqual(star.y, -M);
    });

    it("震动偏移按 shakeFactor 缩放，不按 parallax 缩放", () => {
        // 正确: left = 1000*0.8 - 32*0.5     = 784  → x < 776 才环绕
        // 错误: left = 1000*0.8 - 32*0.8     = 774.4 → x < 766.4 才环绕
        const l = layer({count: 2, parallax: 0.8, shakeFactor: 0.5});
        const field = new StarField(2, [l], M);
        const {cam, move} = makeCamera();
        move(1000, 500, 32, -24);

        writeStar(field, 0, {x: 770, y: 700, speed: 10, radius: 0.5});
        writeStar(field, 1, {x: 780, y: 700, speed: 10, radius: 0.5});
        field.update(0, cam);

        const band = layerBand(l, cam);
        assert.closeTo(band.left, 784, 1e-6, "震动只走 shakeFactor：800 - 16");
        assert.strictEqual(readStar(field, 0).x, band.right + M, "770 在层带外，必须环绕");
        assert.strictEqual(readStar(field, 1).x, 780, "780 在层带内，不能动");
    });

    it("相机静止时星只在竖直方向移动，水平不漂移", () => {
        const l = layer({count: 40, speedMin: 10, speedMax: 10});
        const field = new StarField(40, [l], M);
        const {cam, move} = makeCamera();
        move(400, 300);
        field.init(cam);

        const dt = 1 / 60;
        const before = Array.from({length: 40}, (_, i) => readStar(field, i));
        for (let frame = 0; frame < 60; frame++) field.update(dt, cam);

        for (let i = 0; i < 40; i++) {
            const after = readStar(field, i);
            assert.strictEqual(after.x, before[i].x, `#${i} 水平位置应保持不变`);

            const expected = before[i].y + 10 * dt * 60;
            // 越过下边界的星会被重播种，此时 y 会变小
            if (after.y >= before[i].y) {
                assert.closeTo(after.y, expected, 0.01, `#${i} 60 帧后应正好下落 10*dt*60`);
            }
        }
    });
});

// ================================================================ 渲染

interface CtxHarness {
    readonly ctx: CanvasRenderingContext2D;
    readonly events: string[];
    readonly rects: Array<{ x: number; y: number }>;
    readonly translates: Array<{ x: number; y: number }>;

    count(event: string): number;
}

function makeCtx(): CtxHarness {
    const events: string[] = [];
    const rects: Array<{ x: number; y: number }> = [];
    const translates: Array<{ x: number; y: number }> = [];

    const ctx = {
        fillStyle: "",
        save() {
            events.push("save");
        },
        restore() {
            events.push("restore");
        },
        beginPath() {
            events.push("beginPath");
        },
        fill() {
            events.push("fill");
        },
        translate(x: number, y: number) {
            translates.push({x, y});
            events.push("translate");
        },
        moveTo() {
            events.push("moveTo");
        },
        rect(x: number, y: number) {
            rects.push({x, y});
            events.push("rect");
        },
    };

    return {
        ctx: ctx as unknown as CanvasRenderingContext2D,
        events,
        rects,
        translates,
        count: (event: string) => events.filter(e => e === event).length,
    };
}

describe("渲染", () => {
    it("整帧一次 beginPath / fill，每层一次 translate(cameraOffset * parallax)", () => {
        const layers = [
            layer({count: 10, parallax: 0.8}),
            layer({count: 20, parallax: 0.5}),
            layer({count: 30, parallax: 0.08}),
        ];
        const field = new StarField(60, layers, M);
        const {cam, move} = makeCamera();
        move(400, 300);
        field.init(cam);
        field.update(1 / 60, cam);

        const h = makeCtx();
        field.render(h.ctx, cam, 1);

        assert.strictEqual(h.count("beginPath"), 1, "所有层共用一条路径");
        assert.strictEqual(h.count("fill"), 1, "整帧只光栅化一次");
        assert.strictEqual(h.count("translate"), layers.length);
        assert.strictEqual(h.count("save"), layers.length + 1, "外层 + 每层各一次");
        assert.strictEqual(h.count("restore"), layers.length + 1, "save / restore 必须成对");
        assert.strictEqual(h.events[0], "save");
        assert.strictEqual(h.events[h.events.length - 1], "restore");
        assert.strictEqual(h.events[h.events.length - 2], "fill", "fill 必须在最外层 restore 之前");

        for (let li = 0; li < layers.length; li++) {
            assert.closeTo(h.translates[li].x, -400 * layers[li].parallax, 1e-4);
            assert.closeTo(h.translates[li].y, -300 * layers[li].parallax, 1e-4);
        }
    });

    it("alpha = 1 时直接落在当前帧位置，不带插值残留", () => {
        const field = new StarField(1, [layer({count: 1, radiusMin: 2, radiusMax: 2, speedMin: 30, speedMax: 30})], M);
        const {cam} = makeCamera();
        writeStar(field, 0, {x: 640, y: 360, speed: 30, radius: 2});

        field.update(0.1, cam);
        const star = readStar(field, 0);
        assert.closeTo(star.y, 363, 1e-4);

        const h = makeCtx();
        field.render(h.ctx, cam, 1);

        assert.closeTo(h.rects[0].x, 640, 1e-4);
        assert.closeTo(h.rects[0].y, 363, 1e-4, "alpha=1 不应扣除 prevDt 的位移");
    });

    it("alpha = 0 时回到上一帧位置", () => {
        const field = new StarField(1, [layer({count: 1, radiusMin: 2, radiusMax: 2, speedMin: 30, speedMax: 30})], M);
        const {cam} = makeCamera();
        writeStar(field, 0, {x: 640, y: 360, speed: 30, radius: 2});
        field.update(0.1, cam);

        const h = makeCtx();
        field.render(h.ctx, cam, 0);

        assert.closeTo(h.rects[0].y, 360, 1e-4, "alpha=0 应回退到上一帧位置");
    });

    it("震动按 shakeFactor 叠加到绘制位置上", () => {
        const l = layer({count: 1, parallax: 1, shakeFactor: 0.5, radiusMin: 2, radiusMax: 2});
        const field = new StarField(1, [l], M);
        const {cam, move} = makeCamera();
        move(0, 0, 40, -20);
        writeStar(field, 0, {x: 500, y: 400, speed: 0, radius: 2});

        const h = makeCtx();
        field.render(h.ctx, cam, 1);

        // sx = (lastViewOffset - cameraOffset) * shakeFactor；替身里两者同一帧
        assert.closeTo(h.rects[0].x, 500 + 40 * 0.5, 1e-4);
        assert.closeTo(h.rects[0].y, 400 - 20 * 0.5, 1e-4);
    });

    it("render 不修改星空状态", () => {
        const layers = [layer({count: 5, parallax: 0.5})];
        const field = new StarField(5, layers, M);
        const {cam} = makeCamera();
        field.init(cam);
        field.update(1 / 60, cam);

        const f = internals(field);
        const snapshot = Array.from(f.core);
        field.render(makeCtx().ctx, cam, 0.5);

        assert.deepStrictEqual(Array.from(f.core), snapshot, "渲染必须是只读的");
    });
});
