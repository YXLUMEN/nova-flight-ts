import {MutAABB} from "../../utils/math/MutAABB.ts";
import {MapRenderCache} from "../../client/render/cache/MapRenderCache.ts";
import {ParticleShape} from "./ParticlePool.ts";
import {TAU} from "../../utils/math/math.ts";
import {gradientOf} from "../../utils/render/render.ts";
import {decodeColorToHex} from "../../utils/net_util.ts";
import type {SpriteCtx} from "../../client/render/cache/LRURenderCache.ts";

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
// 低于该半径不生成径向渐变, 退化为纯色
const MIN_GRADIENT_HALF_SIZE = 1;

export class ParticleSprite {
    private readonly bound: MutAABB;
    private readonly cache: MapRenderCache<number>;
    private readonly colorPairs: Map<number, Map<number, number>>;

    private colorPairCount: number = 0;

    // 同一次爆发的粒子颜色一致, 跳过查询
    private lastColor0: number = -1;
    private lastColor1: number = -1;
    private lastPairId: number = 0;

    public constructor() {
        this.bound = new MutAABB(0, 0, 0, 0);
        this.cache = new MapRenderCache(SPRITE_CACHE_CAPACITY);
        this.colorPairs = new Map();
    }

    public get(
        shape: ParticleShape,
        halfW: number,
        color0: number,
        color1: number,
    ): ImageBitmap {
        const flat = halfW < MIN_GRADIENT_HALF_SIZE;
        const reference = this.referenceIndexOf(halfW);
        const radius = REFERENCE_RADII[reference];

        return this.cache.get(
            this.spriteKey(shape, reference, this.colorPairId(color0, color1), flat),
            this.bound.toCenter(0, 0, radius, radius),
            this.drawParticle,
            shape, radius, flat, color0, color1
        );
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
                // 颜色组合超出预算. 重置注册表并丢弃旧贴图键, 避免无界增长
                this.clear();
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

    private referenceIndexOf(halfSize: number): number {
        const k = 32 - Math.clz32(Math.ceil(halfSize) - 1);
        return k > MAX_REFERENCE_INDEX ? MAX_REFERENCE_INDEX : k;
    }

    public clear() {
        this.cache.clear();
        this.colorPairs.clear();
        this.colorPairCount = 0;
        this.lastColor0 = -1;
        this.lastColor1 = -1;
        this.lastPairId = 0;
    }
}