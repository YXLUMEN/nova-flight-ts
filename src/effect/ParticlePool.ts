import {lerp, PI2, rand} from "../utils/math/math.ts";
import type {ParticleEffectType} from "./ParticleEffectType.ts";
import type {HexColor} from "../type/types.ts";
import {encodeColorHex} from "../utils/NetUtil.ts";

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
        shape: ParticleShape = ParticleShape.Circle,
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
        shape: ParticleShape = ParticleShape.Circle,
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
        const n = this.active;
        if (n === 0) return;

        this.drawUntextured(ctx, alpha);
    }

    private drawUntextured(ctx: CanvasRenderingContext2D, alpha: number): void {
        let curKey = -1;
        let pathOpen = false;

        for (let i = 0; i < this.active; i++) {
            const t = this.age[i] / this.life[i];
            const halfW = this.halfW[i] * (1 - this.recession[i] * t);
            if (halfW < 0.1) continue;

            const x = lerp(alpha, this.px[i], this.cx[i]);
            const y = lerp(alpha, this.py[i], this.cy[i]);

            const color0 = this.color0[i], color1 = this.color1[i];
            const key = color0 * 0x1_0000_0000 + color1;

            if (key !== curKey) {
                if (pathOpen) ctx.fill();
                if (color0 === color1 || halfW < 1) {
                    ctx.fillStyle = `#${color0.toString(16)}`;
                } else {
                    const g = ctx.createRadialGradient(x, y, 0, x, y, halfW);
                    g.addColorStop(0, `#${color0.toString(16)}`);
                    g.addColorStop(1, `#${color1.toString(16)}`);
                    ctx.fillStyle = g;
                }

                ctx.beginPath();
                curKey = key;
                pathOpen = true;
            }

            if (this.shape[i] === ParticleShape.Circle && halfW >= 2) {
                ctx.moveTo(x + halfW, y);
                ctx.arc(x, y, halfW, 0, PI2);
            } else {
                const halfH = this.halfH[i] * (1 - this.recession[i] * t);
                ctx.rect(x - halfW, y - halfH, halfW, halfH);
            }
        }

        if (pathOpen) ctx.fill();
    }

    private swapRemove(index: number): void {
        const last = --this.active;
        if (index === last) return;

        for (const buf of this.buffers) {
            buf.copyWithin(index, last, last + 1);
        }
    }

    public clear() {
        this.active = 0;
    }

    public count(): number {
        return this.active;
    }

    public capacity(): number {
        return this.cap;
    }
}

export const enum ParticleShape {
    Circle,
    Rect
}