import type {VisualEffect} from "./VisualEffect.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import type {Vec2} from "../utils/math/Vec2.ts";
import {RadialRing} from "./RadialRing.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";
import {clamp, easeOutQuad, lerp, noise1, TAU} from "../utils/math/math.ts";
import {hexToRgba} from "../utils/util.ts";

/** 传送阶段：OUT 为离开起点，IN 为抵达终点。 */
export const enum TeleportPhase {
    OUT,
    IN,
}

export const TELEPORT_RADIUS = 84;
export const TELEPORT_LIFE = 0.55;

const WARP_SEGMENTS = 48;
const SPIRAL_ARMS = 4;
const SPIRAL_SEGMENTS = 18;

export class TeleportEffect implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<TeleportEffect> = PacketCodecs.of(
        (writer, value) => {
            PacketCodecs.VECTOR2D.encode(writer, value.pos);
            PacketCodecs.COLOR_HEX.encode(writer, value.color);
            writer.writeBoolean(value.phase === TeleportPhase.IN);
            writer.writeUint16(Math.round(value.radius));
            writer.writeFloat(value.life);
        },
        reader => new TeleportEffect(
            PacketCodecs.VECTOR2D.decode(reader),
            PacketCodecs.COLOR_HEX.decode(reader),
            reader.readBoolean() ? TeleportPhase.IN : TeleportPhase.OUT,
            reader.readUint16(),
            reader.readFloat(),
        )
    );

    private readonly pos: Vec2;
    private readonly color: string;
    private readonly phase: TeleportPhase;
    private readonly radius: number;
    private readonly life: number;

    private readonly rings: readonly RadialRing[];

    private age = 0;
    private prevAge = 0;

    public constructor(
        pos: Vec2,
        color: string = '#8a6dff',
        phase: TeleportPhase = TeleportPhase.OUT,
        radius: number = TELEPORT_RADIUS,
        life: number = TELEPORT_LIFE,
    ) {
        this.pos = pos;
        this.color = color;
        this.phase = phase;
        this.radius = Number.isFinite(radius) ? clamp(radius, 1, 0xFFFF) : TELEPORT_RADIUS;
        this.life = Number.isFinite(life) ? Math.max(0.01, life) : TELEPORT_LIFE;

        this.rings = [
            new RadialRing(pos, this.radius * 0.18, this.radius * 1.3, this.life * 0.8, color),
            new RadialRing(pos, this.radius * 0.05, this.radius * 0.8, this.life * 0.5, '#e8e2ff'),
        ];
    }

    public getType(): VisualEffectType<TeleportEffect> {
        return VisualEffectTypes.TELEPORT;
    }

    public tick(dt: number): void {
        if (!this.isAlive()) return;

        this.prevAge = this.age;
        this.age += dt;
        for (const ring of this.rings) ring.tick(dt);
    }

    public render(ctx: CanvasRenderingContext2D, alpha: number): void {
        if (!this.isAlive()) return;

        const t = lerp(clamp(alpha, 0, 1), this.prevAge, this.age);
        const progress = clamp(t / this.life, 0, 1);
        const fade = 1 - progress;

        // 力场与核心共用同一组错相的高频脉冲，形成不规则的闪烁。
        const pulse = Math.max(0, Math.sin(t * 62 + Math.sin(t * 17) * 2.5));
        const flicker = 0.55 + 0.45 * pulse;

        this.renderDistortion(ctx, t, progress, fade * flicker);

        for (const ring of this.rings) ring.render(ctx, alpha);

        this.renderFlash(ctx, t, progress, fade);
    }

    public isAlive(): boolean {
        return this.age < this.life;
    }

    public kill(): void {
        this.age = this.life;
        for (const ring of this.rings) ring.kill();
    }

    private renderDistortion(
        ctx: CanvasRenderingContext2D,
        t: number,
        progress: number,
        opacity: number,
    ): void {
        const outbound = this.phase === TeleportPhase.OUT;
        const grow = easeOutQuad(progress);
        // 离开时力场向外膨胀，抵达时向内收束，两种阶段在视觉上可区分。
        const radius = this.radius * (outbound ? 0.2 + 0.8 * grow : 1.1 - 0.72 * grow);
        const direction = outbound ? 1 : -1;
        const spin = t * 2.6 * direction + progress * 2.4;
        const warpPhase = t * 1.4 * direction;

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;

        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        glow.addColorStop(0, hexToRgba('#ffffff', 0.18 * opacity));
        glow.addColorStop(0.4, hexToRgba(this.color, 0.14 * opacity));
        glow.addColorStop(1, hexToRgba(this.color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.fill();

        // 被空间扭曲的闭合环：使用圆周谐波保证首尾连续，不产生接缝。
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.2;
        for (let band = 0; band < 3; band++) {
            const bandRadius = radius * (0.42 + band * 0.22);
            const phase = warpPhase + band * 1.9;
            const flatten = 0.84 + band * 0.04;

            ctx.globalAlpha = clamp(opacity * (0.42 - band * 0.09), 0, 1);
            ctx.beginPath();
            for (let i = 0; i <= WARP_SEGMENTS; i++) {
                const angle = i / WARP_SEGMENTS * TAU;
                const bend = Math.sin(angle * 3 + phase) * 0.1
                    + Math.sin(angle * 5 - phase * 1.3) * 0.045;
                const x = Math.cos(angle + spin * 0.22) * bandRadius * (1 + bend);
                const y = Math.sin(angle + spin * 0.22) * bandRadius * flatten * (1 + bend);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // 螺旋力场：沿切线方向卷曲并向内收束，强化“空间被拉扯”的观感。
        ctx.lineWidth = 1.6;
        for (let arm = 0; arm < SPIRAL_ARMS; arm++) {
            ctx.globalAlpha = clamp(opacity * (0.62 - arm * 0.09), 0, 1);
            ctx.beginPath();
            for (let i = 0; i <= SPIRAL_SEGMENTS; i++) {
                const q = i / SPIRAL_SEGMENTS;
                const armRadius = radius * (0.1 + 0.9 * q);
                const wobble = noise1(arm * 9.7 + q * 3.4 + t * 2.2) * radius * 0.06 * q;
                const angle = arm * TAU / SPIRAL_ARMS + spin * 0.9 + q * 2.3 * direction;
                const x = Math.cos(angle) * (armRadius + wobble);
                const y = Math.sin(angle) * (armRadius + wobble) * 0.9;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    /** 闪烁：高频脉冲的白热核心与光晕。 */
    private renderFlash(
        ctx: CanvasRenderingContext2D,
        t: number,
        progress: number,
        fade: number,
    ): void {
        const blink = Math.max(0, Math.sin(t * 64 + Math.sin(t * 19) * 3));
        const flash = blink * blink;
        const coreRadius = Math.max(1.5, this.radius * (0.08 + 0.16 * flash) * (1 - progress * 0.35));
        const haloRadius = coreRadius * 4.5;

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.globalCompositeOperation = 'lighter';

        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloRadius);
        halo.addColorStop(0, hexToRgba('#ffffff', (0.08 + 0.7 * flash) * fade));
        halo.addColorStop(0.35, hexToRgba(this.color, 0.3 * fade));
        halo.addColorStop(1, hexToRgba(this.color, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, haloRadius, 0, TAU);
        ctx.fill();

        ctx.globalAlpha = clamp(fade * (0.1 + 0.9 * flash), 0, 1);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius, 0, TAU);
        ctx.fill();

        ctx.restore();
    }
}
