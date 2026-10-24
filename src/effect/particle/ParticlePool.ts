import type {ParticleSystem} from "./ParticleSystem.ts";
import {lerp} from "../../utils/math/math.ts";
import {BIT_ROT, P_IDX, ParticleAttr, ROW_SLOTS, SHAPE_MASK} from "./ParticleAttr.ts";
import {ParticleSprite} from "./ParticleSprite.ts";
import {ParticleStore} from "./ParticleStore.ts";
import {ParticleShape} from "./ParticleShape.ts";

// 小于该半尺寸的粒子不可见, 直接跳过
const MIN_HALF_SIZE = 0.1;

export class ParticlePool {
    private readonly store: ParticleStore;
    private readonly systems: ParticleSystem[] = [];
    private readonly sprites: ParticleSprite;

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

        store.meta[i] = shape;
        if (rot !== 0) store.attach(i, ParticleAttr.ROT, rot);

        return i;
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

    public attach(index: number, attr: ParticleAttr, value: number): void {
        this.store.attach(index, attr, value);
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

    public availableCap(): number {
        return this.store.cap - this.store.active;
    }

    public active(): number {
        return this.store.active;
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
