import {ParticleSprite} from "../../src/effect/particle/ParticleSprite";
import {ParticleLayout} from "./ParticleLayout";
import {HexColor} from "../../src/type/types";
import {encodeColorHex} from "../../src/utils/net_util";
import {ParticleEffectType} from "../../src/effect/particle/ParticleEffectType";
import {lerp, rand, randInt} from "../../src/utils/math/math";
import {ParticleShape} from "../../src/effect/particle/ParticleShape";

const MIN_HALF_SIZE = 0.1;


export class ParticlePoolSoA {
    private readonly cap: number;
    private readonly layout: ParticleLayout;
    private readonly sprites: ParticleSprite;

    private readonly cx: Float32Array;
    private readonly cy: Float32Array;
    private readonly px: Float32Array;
    private readonly py: Float32Array;

    private readonly vx: Float32Array;
    private readonly vy: Float32Array;
    private readonly rot: Float32Array;

    private readonly size: Float32Array;
    private readonly shape: Uint8Array;

    private readonly age: Uint32Array;
    private readonly life: Uint32Array;
    private readonly recession: Float32Array;
    private readonly drag: Float32Array;

    private readonly color0: Uint32Array;
    private readonly color1: Uint32Array;

    private active: number = 0;

    public constructor(capacity: number = 4096) {
        this.cap = capacity;

        const layout = new ParticleLayout();
        this.layout = layout;
        this.sprites = new ParticleSprite();

        this.px = layout.f32(capacity);
        this.py = layout.f32(capacity);
        this.cx = layout.f32(capacity);
        this.cy = layout.f32(capacity);
        this.vx = layout.f32(capacity);
        this.vy = layout.f32(capacity);
        this.rot = layout.f32(capacity);

        this.shape = layout.u8(capacity);
        this.size = layout.f32(capacity);

        this.age = layout.u32(capacity);
        this.life = layout.u32(capacity);
        this.recession = layout.f32(capacity);
        this.drag = layout.f32(capacity);

        this.color0 = layout.u32(capacity);
        this.color1 = layout.u32(capacity);
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
        size: number,
        shape: ParticleShape = ParticleShape.CIRCLE,
        colorFrom: number, colorTo: number = colorFrom,
        drag: number = 0,
        recession: number = 0.6,
        rot: number = 0,
    ) {
        if (this.active >= this.cap || life <= 0) return;
        const i = this.active++;

        this.cx[i] = x;
        this.cy[i] = y;
        this.px[i] = x;
        this.py[i] = y;

        this.vx[i] = vx;
        this.vy[i] = vy;
        this.rot[i] = rot;

        this.age[i] = 0;
        this.life[i] = life;
        this.recession[i] = recession;

        this.size[i] = size;

        this.color0[i] = colorFrom;
        this.color1[i] = colorTo;

        this.shape[i] = shape;
        this.drag[i] = drag;
    }

    public spawn(
        x: number, y: number,
        vx: number, vy: number,
        life: number,
        size: number,
        shape: ParticleShape = ParticleShape.CIRCLE,
        colorFrom: HexColor, colorTo: HexColor = colorFrom,
        drag?: number,
        recession?: number,
        rot?: number,
    ) {
        this.spawnResolve(
            x, y,
            vx, vy,
            life,
            size,
            shape,
            encodeColorHex(colorFrom), encodeColorHex(colorTo),
            drag, recession, rot
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
            const angle = baseAngle + rand(type.spreadMin, type.spreadMax);

            this.spawnResolve(
                x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                randInt(type.lifeMin, type.lifeMax),
                rand(type.sizeMin, type.sizeMax),
                type.shape,
                type.colorFrom, type.colorTo,
                type.drag,
                type.recession,
                rand(type.rotMin, type.rotMax),
            );
        }
    }

    public tick(dt: number) {
        for (let i = this.active - 1; i >= 0; i--) {
            let age = this.age[i];
            age++;
            if (age >= this.life[i]) {
                this.swapRemove(i);
                continue;
            }

            this.age[i] = age;
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
        const active = this.active;

        for (let i = 0; i < active; i++) {
            const k = this.age[i] / this.life[i];
            const shrink = 1 - this.recession[i] * k;
            const size = this.size[i] * shrink;
            if (size < MIN_HALF_SIZE) continue;

            const x = lerp(alpha, this.px[i], this.cx[i]);
            const y = lerp(alpha, this.py[i], this.cy[i]);

            const sprite = this.sprites.get(
                this.shape[i],
                size,
                this.color0[i],
                this.color1[i]
            );

            const rot = this.rot[i];
            const w = size * 2;

            if (rot === 0) {
                ctx.drawImage(sprite, x - size, y - size, w, w);
                continue;
            }

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.drawImage(sprite, -size, -size, w, w);
            ctx.restore();
        }
    }

    private swapRemove(index: number): void {
        const last = --this.active;
        if (index === last) return;

        const buffers = this.layout.arrays;
        for (let i = 0; i < buffers.length; i++) {
            buffers[i].copyWithin(index, last, last + 1);
        }
    }

    public reset(): void {
        this.active = 0;
    }

    public clearCache(): void {
        this.sprites.clear();
    }
}