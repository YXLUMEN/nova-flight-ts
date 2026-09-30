import type {ParticleEffectType} from "./ParticleEffectType.ts";
import type {HexColor} from "../type/types.ts";
import type {SpriteCtx} from "../client/render/cache/LRURenderCache.ts";
import {lerp, rand, TAU} from "../utils/math/math.ts";
import {decodeColorToHex, encodeColorHex} from "../utils/net_util.ts";
import {MemoryLRU} from "../utils/collection/MemoryLRU.ts";
import {buildSprite} from "../client/render/cache/RenderCache.ts";
import {MutAABB} from "../utils/math/MutAABB.ts";
import {gradientOf} from "../utils/render/render.ts";

/**
 * 贴图参考半径阶梯（px, 2 的幂）.
 * 粒子只会随 recession 缩小, 所以每张贴图按“不小于实际半径的最小档位”烘焙,
 * 绘制时只向下缩放（缩放比 ≤2）, 贴图始终清晰. 缩小用 scale 拉伸是安全的,
 * 反过来放宽就会糊. 这样贴图键里的尺寸维度从“0.5px 档位（~50 组合/色对）”塌成“6 档”.
 */
const REFERENCE_RADII = [1, 2, 4, 8, 16, 32];
const REFERENCE_COUNT = REFERENCE_RADII.length;
// 档位上限（半径 32px）, 超过则按最大档烘焙后再拉伸
const MAX_REFERENCE_INDEX = REFERENCE_COUNT - 1;
// 贴图缓存容量: 键空间 ≈ 颜色对数 × 3 形状 × 6 参考档.
const SPRITE_CACHE_CAPACITY = 512;
// 颜色对注册表容量上限, 超出后整体重置, 避免无界增长
const COLOR_PAIR_LIMIT = 4096;
// 小于该半径的粒子不可见, 直接跳过
const MIN_HALF_SIZE = 0.1;
// 低于该半径不生成径向渐变, 退化为纯色
const MIN_GRADIENT_HALF_SIZE = 1;
// 圆形粒子低于该半径时按矩形绘制
const MIN_CIRCLE_HALF_SIZE = 1.5;


export class ParticlePool {
    private readonly cap: number;

    private readonly cx: Float32Array;
    private readonly cy: Float32Array;
    private readonly px: Float32Array;
    private readonly py: Float32Array;

    private readonly vx: Float32Array;
    private readonly vy: Float32Array;

    // private readonly rot: Uint8Array;

    private readonly halfW: Float32Array;
    private readonly halfH: Float32Array;
    private readonly shape: Uint8Array;

    private readonly age: Float32Array;
    private readonly life: Float32Array;
    private readonly recession: Float32Array;
    private readonly drag: Float32Array;

    private readonly color0: Uint32Array;
    private readonly color1: Uint32Array;

    private readonly buffers: Array<Float32Array | Uint32Array | Uint8Array>;

    private readonly bound: MutAABB;
    private readonly sprites: MemoryLRU<number, ImageBitmap>;
    private readonly colorPairs: Map<number, Map<number, number>>;
    private colorPairCount: number = 0;

    // 同一次爆发的粒子颜色一致, 跳过查询
    private lastColor0: number = -1;
    private lastColor1: number = -1;
    private lastPairId: number = 0;

    private active: number = 0;

    public constructor(capacity: number = 4096) {
        this.cap = capacity;

        this.px = new Float32Array(capacity);
        this.py = new Float32Array(capacity);
        this.cx = new Float32Array(capacity);
        this.cy = new Float32Array(capacity);
        this.vx = new Float32Array(capacity);
        this.vy = new Float32Array(capacity);
        // this.rot = new Uint8Array(capacity);

        this.shape = new Uint8Array(capacity);
        this.halfW = new Float32Array(capacity);
        this.halfH = new Float32Array(capacity);

        this.age = new Float32Array(capacity);
        this.life = new Float32Array(capacity);
        this.recession = new Float32Array(capacity);
        this.drag = new Float32Array(capacity);

        this.color0 = new Uint32Array(capacity);
        this.color1 = new Uint32Array(capacity);

        this.buffers = [
            this.px, this.py, this.cx, this.cy, this.vx, this.vy,
            this.shape, this.halfW, this.halfH,
            this.age, this.life, this.recession, this.drag,
            this.color0, this.color1,
        ];

        this.bound = new MutAABB(0, 0, 0, 0);
        this.sprites = new MemoryLRU<number, ImageBitmap>(
            SPRITE_CACHE_CAPACITY,
            (_, val) => val?.close()
        );
        this.colorPairs = new Map();
    }

    /**
     * 以已编码的颜色数值生成一个粒子
     *
     * color 必须是标准的 0xRRGGBBAA 编码
     * */
    public spawnResolve(
        x: number, y: number,
        vx: number, vy: number,
        life: number,
        halfW: number,
        halfH: number = halfW,
        shape: ParticleShape = ParticleShape.CIRCLE,
        colorFrom: number, colorTo: number = colorFrom,
        drag: number = 0,
        recession: number = 0.6
    ) {
        if (this.active >= this.cap || life <= 0) return;
        const i = this.active++;

        this.cx[i] = x;
        this.cy[i] = y;
        this.px[i] = x;
        this.py[i] = y;

        this.vx[i] = vx;
        this.vy[i] = vy;

        this.age[i] = 0;
        this.life[i] = life;
        this.recession[i] = recession;

        this.halfW[i] = halfW;
        this.halfH[i] = halfH;

        this.color0[i] = colorFrom;
        this.color1[i] = colorTo;
        this.shape[i] = shape;
        this.drag[i] = drag;
    }

    public spawn(
        x: number, y: number,
        vx: number, vy: number,
        life: number,
        halfW: number,
        halfH: number = halfW,
        shape: ParticleShape = ParticleShape.CIRCLE,
        colorFrom: HexColor, colorTo: HexColor = colorFrom,
        drag: number = 0,
        recession: number = 0.6
    ) {
        this.spawnResolve(
            x, y,
            vx, vy,
            life,
            halfW, halfH,
            shape,
            encodeColorHex(colorFrom), encodeColorHex(colorTo),
            drag, recession
        );
    }

    public spawnEffect(
        type: ParticleEffectType,
        x: number, y: number,
        count: number,
        baseAngle: number = 0
    ): void {
        const max = Math.min(count, this.cap - this.active);
        for (let i = 0; i < max; i++) {
            const speed = rand(type.speedMin, type.speedMax);
            const spread = rand(type.spreadMin, type.spreadMax);

            const angle = baseAngle + spread;
            const size = rand(type.sizeMin, type.sizeMax);

            this.spawnResolve(
                x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                rand(type.lifeMin, type.lifeMax),
                size,
                size,
                type.shape,
                type.colorFrom, type.colorTo,
                type.drag,
                type.recession
            );
        }
    }

    public tick(dt: number) {
        for (let i = this.active - 1; i >= 0; i--) {
            this.age[i] += dt;
            if (this.age[i] >= this.life[i]) {
                this.swapRemove(i);
                continue;
            }

            const acc = 1 - this.drag[i] * dt;
            const vx = this.vx[i] * acc;
            const vy = this.vy[i] * acc;
            this.vx[i] = vx;
            this.vy[i] = vy;

            this.px[i] = this.cx[i];
            this.py[i] = this.cy[i];
            this.cx[i] += vx * dt;
            this.cy[i] += vy * dt;
        }
    }

    public render(ctx: CanvasRenderingContext2D, alpha: number) {
        if (this.active === 0) return;

        this.drawCached(ctx, alpha);
    }

    private drawCached(ctx: CanvasRenderingContext2D, alpha: number): void {
        for (let i = 0; i < this.active; i++) {
            const shrink = 1 - this.recession[i] * (this.age[i] / this.life[i]);
            const halfW = this.halfW[i] * shrink;
            if (halfW < MIN_HALF_SIZE) continue;

            // 圆形半径过小时退化为矩形
            const shape = this.shape[i];
            const circle = shape === ParticleShape.CIRCLE && halfW >= MIN_CIRCLE_HALF_SIZE;
            const variant = circle
                ? ParticleShape.CIRCLE
                : shape === ParticleShape.TRIANGLE ? ParticleShape.TRIANGLE : ParticleShape.RECT;
            const halfH = circle ? halfW : this.halfH[i] * shrink;

            const x = lerp(alpha, this.px[i], this.cx[i]);
            const y = lerp(alpha, this.py[i], this.cy[i]);
            const color0 = this.color0[i], color1 = this.color1[i];
            // 同色或实际半径 < 1 时用纯色.
            const flat = color0 === color1 || halfW < MIN_GRADIENT_HALF_SIZE;

            // 参考档位按“横/纵较大者”取, 贴图始终是正方形烘焙、按需拉伸
            const reference = this.referenceIndexOf(halfW > halfH ? halfW : halfH);
            const sprite = this.sprite(
                this.spriteKey(variant, reference, this.colorPairId(color0, color1), flat),
                variant, reference, color0, color1, flat
            );

            ctx.drawImage(sprite, x - halfW, y - halfH, halfW * 2, halfH * 2);
        }
    }

    private sprite(
        key: number,
        shape: ParticleShape,
        reference: number,
        color0: number,
        color1: number,
        flat: boolean
    ): ImageBitmap {
        const cached = this.sprites.get(key);
        if (cached !== null) return cached;

        const radius = REFERENCE_RADII[reference];
        const bitmap = buildSprite(
            this.bound.toCenter(0, 0, radius, radius),
            this.drawParticle,
            shape, radius, flat, color0, color1
        );

        this.sprites.set(key, bitmap);
        return bitmap;
    }

    private drawParticle(
        ctx: SpriteCtx,
        shape: ParticleShape,
        radius: number,
        flat: boolean,
        color0: number,
        color1: number
    ): void {
        ctx.fillStyle = flat ? decodeColorToHex(color0) : gradientOf(ctx, radius, color0, color1);
        ctx.beginPath();

        if (shape === ParticleShape.CIRCLE) {
            ctx.arc(0, 0, radius, 0, TAU);
        } else if (shape === ParticleShape.TRIANGLE) {
            ctx.moveTo(0, -radius);          // 顶点
            ctx.lineTo(radius, radius);      // 右下
            ctx.lineTo(-radius, radius);     // 左下
            ctx.closePath();
        } else {
            ctx.rect(-radius, -radius, radius * 2, radius * 2);
        }

        ctx.fill();
    }

    private colorPairId(color0: number, color1: number): number {
        if (color0 === this.lastColor0 && color1 === this.lastColor1) return this.lastPairId;

        let colors = this.colorPairs.get(color0);
        if (colors === undefined) {
            colors = new Map();
            this.colorPairs.set(color0, colors);
        }

        let id = colors.get(color1);
        if (id === undefined) {
            if (this.colorPairCount >= COLOR_PAIR_LIMIT) {
                // 颜色组合超出预算: 重置注册表并丢弃旧贴图键, 避免无界增长
                this.clearCache();
                colors = new Map();
                this.colorPairs.set(color0, colors);
            }
            id = this.colorPairCount++;
            colors.set(color1, id);
        }

        this.lastColor0 = color0;
        this.lastColor1 = color1;
        this.lastPairId = id;
        return id;
    }

    private spriteKey(shape: ParticleShape, reference: number, pairId: number, flat: boolean): number {
        return ((pairId * REFERENCE_COUNT + reference) * 3 + shape) * 2 + (flat ? 1 : 0);
    }

    private swapRemove(index: number): void {
        const last = --this.active;
        if (index === last) return;

        for (const buf of this.buffers) {
            buf.copyWithin(index, last, last + 1);
        }
    }

    private referenceIndexOf(halfSize: number): number {
        // 取第一个 ≥ halfSize 的参考档位: 保证 drawImage 只做缩小
        for (let i = 0; i < MAX_REFERENCE_INDEX; i++) {
            if (REFERENCE_RADII[i] >= halfSize) return i;
        }
        return MAX_REFERENCE_INDEX;
    }

    public reset(): void {
        this.active = 0;
    }

    public clearCache(): void {
        this.sprites.clear();
        this.colorPairs.clear();
        this.colorPairCount = 0;
        this.lastColor0 = -1;
        this.lastColor1 = -1;
        this.lastPairId = 0;
    }
}

export const enum ParticleShape {
    CIRCLE, // 圆形, 半径为 halfW
    RECT, // 矩形, 半宽 halfW、半高 halfH
    TRIANGLE // 等腰三角形, 顶点朝上, 内接于半宽 halfW、半高 halfH 的包围盒
}