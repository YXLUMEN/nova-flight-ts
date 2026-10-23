import type {ParticleEffectType} from "./ParticleEffectType.ts";
import type {HexColor} from "../../type/types.ts";
import type {ParticleSystem} from "./ParticleSystem.ts";
import {lerp, rand, randInt} from "../../utils/math/math.ts";
import {encodeColorHex} from "../../utils/net_util.ts";
import {BIT_ROT, P_IDX, ParticleAttr, ROW_SLOTS, SHAPE_MASK} from "./ParticleAttr.ts";
import {ParticleSprite} from "./ParticleSprite.ts";
import {ParticleStore} from "./ParticleStore.ts";
import {ParticleShape} from "./ParticleShape.ts";

// 小于该半尺寸的粒子不可见, 直接跳过
const MIN_HALF_SIZE = 0.1;

export class ParticlePool {
    private readonly store: ParticleStore;
    private readonly sprites: ParticleSprite;
    private readonly systems: ParticleSystem[] = [];

    public constructor(capacity: number = 4096) {
        this.store = new ParticleStore(capacity);
        this.sprites = new ParticleSprite();
    }

    /**
     * 以已编码的颜色数值生成一个粒子.
     *
     * color 必须是标准的 0xRRGGBBAA 编码.
     * 返回槽位下标, 失败 (池满 / life ≤ 0) 返回 -1.
     */
    public spawnResolve(
        x: number, y: number,
        vx: number, vy: number,
        life: number,
        size: number,
        shape: ParticleShape = ParticleShape.CIRCLE,
        colorFrom: number, colorTo: number = colorFrom,
        acc: number = 1,
        recession: number = 0.6,
        rot: number = 0,
    ): number {
        if (life <= 0) return -1;
        if (shape > SHAPE_MASK || shape < 0) shape = ParticleShape.RECT;

        const store = this.store;
        const i = store.alloc();
        if (i < 0) return -1;

        const b = i * ROW_SLOTS;
        const f32 = store.f32;
        const u32 = store.u32;

        f32[b + P_IDX.CX] = x;
        f32[b + P_IDX.CY] = y;
        f32[b + P_IDX.PX] = x;
        f32[b + P_IDX.PY] = y;
        f32[b + P_IDX.VX] = vx;
        f32[b + P_IDX.VY] = vy;
        f32[b + P_IDX.ACC] = acc;
        f32[b + P_IDX.SIZE] = size;
        f32[b + P_IDX.REC] = recession;

        u32[b + P_IDX.AGE] = 0;
        u32[b + P_IDX.LIFE] = life;
        u32[b + P_IDX.C0] = colorFrom;
        u32[b + P_IDX.C1] = colorTo;

        // 先落基础位 (shape), 再交给 attach 置位 + 记账
        store.meta[i] = shape;
        if (rot !== 0) store.attach(i, ParticleAttr.ROT, rot);

        return i;
    }

    /**
     * traits 是可选的一批外挂属性 (将来 ParticleEffectType 自带 traits 后直接透传),
     * 每个粒子生成后统一附加; 与 spawnResolve 的内置属性冲突时以 traits 为准.
     */
    public spawn(
        type: ParticleEffectType,
        x: number, y: number,
        count: number,
        baseAngle: number = 0,
    ): void {
        const store = this.store;
        const max = Math.min(count, store.cap - store.active);
        if (max <= 0) return;

        const shape = type.shape;
        const rotatable = shape !== ParticleShape.CIRCLE;
        const traitCount = type.traits === null ? 0 : type.traits.length;

        for (let k = 0; k < max; k++) {
            const speed = rand(type.speedMin, type.speedMax);
            const angle = baseAngle + rand(type.spreadMin, type.spreadMax);

            const i = this.spawnResolve(
                x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                randInt(type.lifeMin, type.lifeMax),
                rand(type.sizeMin, type.sizeMax),
                shape,
                type.colorFrom, type.colorTo,
                type.acc,
                type.recession,
                rotatable ? rand(type.rotMin, type.rotMax) : 0,
            );
            if (i < 0) continue;

            for (let t = 0; t < traitCount; t++) {
                const trait = type.traits![t];
                store.attach(i, trait.attr, trait.value);
            }
        }
    }

    public spawnRaw(
        x: number, y: number,
        vx: number, vy: number,
        life: number,
        size: number,
        shape: ParticleShape = ParticleShape.CIRCLE,
        colorFrom: HexColor, colorTo: HexColor = colorFrom,
        acc?: number,
        recession?: number,
        rot?: number,
    ): number {
        return this.spawnResolve(
            x, y,
            vx, vy,
            life,
            size,
            shape,
            encodeColorHex(colorFrom), encodeColorHex(colorTo),
            acc, recession, rot
        );
    }

    public tick(dt: number): void {
        this.reap();

        const store = this.store;
        const mask = store.mask;
        const systems = this.systems;
        for (let s = 0; s < systems.length; s++) {
            const system = systems[s];
            if ((mask & system.bit) !== 0) system.tick(store, dt);
        }

        this.integrate();
    }

    public render(ctx: CanvasRenderingContext2D, alpha: number): void {
        const store = this.store;
        const n = store.active;
        if (n === 0) return;

        const f32 = store.f32;
        const u32 = store.u32;
        const meta = store.meta;
        const sprites = this.sprites;

        const rotCol = (store.mask & BIT_ROT) !== 0 ? store.peek(ParticleAttr.ROT) : null;
        const rotBit = rotCol === null ? 0 : BIT_ROT;

        for (let i = 0; i < n; i++) {
            const b = i * ROW_SLOTS;
            const size = f32[b + P_IDX.SIZE] * (1 - f32[b + P_IDX.REC] * (u32[b + P_IDX.AGE] / u32[b + P_IDX.LIFE]));
            if (size < MIN_HALF_SIZE) continue;

            const x = lerp(alpha, f32[b + P_IDX.PX], f32[b + P_IDX.CX]);
            const y = lerp(alpha, f32[b + P_IDX.PY], f32[b + P_IDX.CY]);

            const m = meta[i];
            const sprite = sprites.get(m & SHAPE_MASK, size, u32[b + P_IDX.C0], u32[b + P_IDX.C1]);
            const w = size * 2;

            if ((m & rotBit) !== 0) {
                const rot = rotCol![i];
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                ctx.drawImage(sprite, -size, -size, w, w);
                ctx.restore();
                continue;
            }

            ctx.drawImage(sprite, x - size, y - size, w, w);
        }
    }

    public registerSystem(system: ParticleSystem): void {
        this.systems.push(system);
    }

    public unregisterSystem(system: ParticleSystem): void {
        const index = this.systems.indexOf(system);
        if (index >= 0) this.systems.splice(index, 1);
    }

    public reset(): void {
        this.store.clear();
    }

    public clearCache(): void {
        this.sprites.clear();
    }

    private reap(): void {
        const store = this.store;
        const u = store.u32;

        for (let i = store.active - 1; i >= 0; i--) {
            const b = i * ROW_SLOTS;
            const age = u[b + P_IDX.AGE] + 1;
            if (age >= u[b + P_IDX.LIFE]) {
                store.swapRemove(i);
                continue;
            }

            u[b + P_IDX.AGE] = age;
        }
    }

    private integrate(): void {
        const store = this.store;
        const f32 = store.f32;

        for (let i = store.active - 1; i >= 0; i--) {
            const b = i * ROW_SLOTS;

            const acc = f32[b + P_IDX.ACC];
            const vx = f32[b + P_IDX.VX] * acc;
            const vy = f32[b + P_IDX.VY] * acc;

            f32[b + P_IDX.VX] = vx;
            f32[b + P_IDX.VY] = vy;

            f32[b + P_IDX.PX] = f32[b + P_IDX.CX];
            f32[b + P_IDX.PY] = f32[b + P_IDX.CY];
            f32[b + P_IDX.CX] = f32[b + P_IDX.CX] + vx;
            f32[b + P_IDX.CY] = f32[b + P_IDX.CY] + vy;
        }
    }
}
