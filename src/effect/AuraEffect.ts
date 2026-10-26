import type {VisualEffect} from "./VisualEffect.ts";
import type {Entity} from "../entity/Entity.ts";
import type {Consumer} from "../type/types.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import type {ViewRect} from "../client/render/Camera.ts";
import {lerp, TAU} from "../utils/math/math.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {BuiltInPath} from "../client/render/BuiltInPath.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";
import {isRangeInView} from "../utils/render/render.ts";

export class AuraEffect implements VisualEffect {
    public bindEntity: Entity | null = null;
    public onTick: Consumer<AuraEffect> | null = null;
    public dispose: Consumer<void> | null = null;

    private x: number;
    private y: number;
    private readonly path: Path2D;
    private readonly radius: number;
    private readonly life: number;
    private readonly color: string;
    private age: number = 0;

    private prevT = 0;
    private t = 0;

    public constructor(center: Vec2, radius = 24, life = 1, color = '#5095ff', shape: ShieldShape = 'hexagon') {
        this.x = center.x;
        this.y = center.y;
        this.radius = radius;
        this.life = life;
        this.color = color;
        this.path = BuiltInPath.get(shape)!;
    }

    public getType(): VisualEffectType<AuraEffect> {
        return VisualEffectTypes.NONE;
    }

    public tick(dt: number): void {
        if (this.bindEntity?.isRemoved()) {
            this.kill();
            return;
        }

        this.prevT = this.t;
        this.t += dt;
        this.age += dt;
        this.onTick?.(this);
    }

    public render(ctx: CanvasRenderingContext2D, tickDelta: number): void {
        if (!this.isAlive()) return;

        const t = lerp(tickDelta, this.prevT, this.t);
        const bindEntity = this.bindEntity;
        if (bindEntity) {
            this.x = lerp(tickDelta, bindEntity.prevX, bindEntity.getX());
            this.y = lerp(tickDelta, bindEntity.prevY, bindEntity.getY());
        }

        const x = this.x;
        const y = this.y;
        const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 1.2);
        // radius 是"外接半径"：归一化路径的范围是 [-1,1]，故缩放系数即 r
        const r = this.radius * (0.97 + 0.03 * pulse);
        const invR = 1 / r;
        const path = this.path;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.4);
        // 把 [-1,1] 的路径缩放到半径 r。
        // 注意：lineWidth / setLineDash 会随 CTM 缩放，必须用 invR 反向补偿，
        // 否则实体会越大线越粗；shadowBlur 不受 CTM 影响，保持恒定即可。
        ctx.scale(r, r);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 外辉光
        ctx.globalAlpha = 0.3 + 0.2 * pulse;
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 5 * invR;
        ctx.stroke(path);
        ctx.shadowBlur = 0;

        // 主体描边
        ctx.globalAlpha = 0.85 + 0.15 * pulse;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2 * invR;
        ctx.stroke(path);

        // 白热内芯高光
        ctx.globalAlpha = 0.35 + 0.25 * pulse;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.9 * invR;
        ctx.stroke(path);

        ctx.restore();
    }

    public shouldRender(view: ViewRect): boolean {
        return isRangeInView(this.x, this.y, this.radius + 5, view);
    }

    public isAlive(): boolean {
        return this.age < this.life;
    }

    public kill(): void {
        this.dispose?.();
        this.bindEntity = null;
        this.age = this.life;
    }

    public reset() {
        this.age = 0;
    }
}

type ShieldShape = 'bracket' | 'hexagon' | 'circle';