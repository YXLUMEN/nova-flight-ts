import {lerp, PI2, rand} from "../utils/math/math.ts";
import type {Vec2} from "../utils/math/Vec2.ts";
import {encodeColorHex} from "../utils/NetUtil.ts";
import type {ParticleEffectType} from "./ParticleEffectType.ts";
import type {HexColor} from "../type/types.ts";

export class ParticlePool {
    private readonly cap: number;

    private readonly cx: Float32Array;
    private readonly cy: Float32Array;
    private readonly px: Float32Array;
    private readonly py: Float32Array;

    private readonly vx: Float32Array;
    private readonly vy: Float32Array;

    private readonly rot: Uint8Array;

    private readonly halfW: Float32Array;
    private readonly halfH: Float32Array;
    private readonly type: Uint8Array;

    private readonly age: Float32Array;
    private readonly life: Float32Array;

    private readonly color0: Uint32Array;
    private readonly color1: Uint32Array;
    private readonly drag: Float32Array;

    private active: number = 1;

    public constructor(capacity: number = 4096) {
        this.cap = capacity;
        this.cx = new Float32Array(capacity);
        this.cy = new Float32Array(capacity);
        this.px = new Float32Array(capacity);
        this.py = new Float32Array(capacity);

        this.vx = new Float32Array(capacity);
        this.vy = new Float32Array(capacity);

        this.rot = new Uint8Array(capacity);

        this.halfW = new Float32Array(capacity);
        this.halfH = new Float32Array(capacity);
        this.type = new Uint8Array(capacity);

        this.age = new Float32Array(capacity);
        this.life = new Float32Array(capacity);

        this.color0 = new Uint32Array(capacity);
        this.color1 = new Uint32Array(capacity);
        this.drag = new Float32Array(capacity);
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

    public render(ctx: CanvasRenderingContext2D, dt: number) {
        const n = this.active;
        if (n === 0) return;
        this.drawUntextured(ctx, 0, n, dt);
    }

    public spawn(
        x: number, y: number,
        vx: number, vy: number,
        life: number,
        halfW: number,
        halfH: number = halfW,
        type: number = 0,
        colorFrom: HexColor, colorTo: HexColor = colorFrom,
        drag: number = 0
    ) {
        if (this.active >= this.cap) return;
        const i = this.active++;

        this.cx[i] = x;
        this.cy[i] = y;
        this.px[i] = x;
        this.py[i] = y;

        this.vx[i] = vx;
        this.vy[i] = vy;

        this.age[i] = 0;
        this.life[i] = life;

        this.halfW[i] = halfW;
        this.halfH[i] = halfH;

        this.color0[i] = encodeColorHex(colorFrom);
        this.color1[i] = encodeColorHex(colorTo);
        this.type[i] = type;
        this.drag[i] = drag;
    }

    public spawnEffect(
        type: ParticleEffectType,
        pos: Vec2,
        count: number,
        baseAngle: number = 0
    ): void {
        for (let i = 0; i < count; i++) {
            const speed = rand(type.speedMin, type.speedMax);
            const spread = rand(type.spreadMin, type.spreadMax);

            const sign = Math.random() < 0.5 ? 1 : -1;
            const angle = baseAngle + sign * spread;
            const size = rand(type.sizeMin, type.sizeMax);

            this.spawn(
                pos.x, pos.y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                rand(type.lifeMin, type.lifeMax),
                size,
                size,
                type.type,
                type.colorFrom, type.colorTo,
                type.drag
            );
        }
    }

    private drawUntextured(
        ctx: CanvasRenderingContext2D,
        lo: number,
        hi: number,
        dt: number
    ): void {
        let curKey = -1;
        let pathOpen = false;

        for (let i = lo; i < hi; i++) {
            const t = this.age[i] / this.life[i];
            const halfW = this.halfW[i] * (1 - 0.6 * t);
            if (halfW < 0.1) continue;

            const x = lerp(dt, this.px[i], this.cx[i]);
            const y = lerp(dt, this.py[i], this.cy[i]);

            const colorFrom = this.color0[i], colorTo = this.color1[i];
            const key = colorFrom + colorTo;

            if (key !== curKey) {
                if (pathOpen) ctx.fill();
                if (colorFrom === colorTo || halfW < 1) {
                    ctx.fillStyle = `#${colorFrom.toString(16)}`;
                } else {
                    const g = ctx.createRadialGradient(x, y, 0, x, y, halfW);
                    g.addColorStop(0, `#${colorFrom.toString(16)}`);
                    g.addColorStop(1, `#${colorTo.toString(16)}`);
                    ctx.fillStyle = g;
                }

                ctx.beginPath();
                curKey = key;
                pathOpen = true;
            }

            if (this.type[i] === 0) {
                ctx.moveTo(x + halfW, y);
                ctx.arc(x, y, halfW, 0, PI2);
                continue;
            }
            const halfH = this.halfH[i] * (1 - 0.6 * t);
            ctx.rect(x - halfW, y - halfH, halfW, halfH);
        }

        if (pathOpen) ctx.fill();
    }

    private swapRemove(i: number): void {
        const l = --this.active;
        if (i === l) return;

        this.cx[i] = this.cx[l];
        this.cy[i] = this.cy[l];
        this.px[i] = this.px[l];
        this.py[i] = this.py[l];

        this.vx[i] = this.vx[l];
        this.vy[i] = this.vy[l];

        this.rot[i] = this.rot[l];

        this.age[i] = this.age[l];
        this.life[i] = this.life[l];

        this.halfW[i] = this.halfW[l];
        this.halfH[i] = this.halfH[l];

        this.color0[i] = this.color0[l];
        this.color1[i] = this.color1[l];
        this.type[i] = this.type[l];
        this.drag[i] = this.drag[l];
    }
}