import type {VisualEffect} from "./VisualEffect.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {decodeFromByte, encodeToByte} from "../utils/NetUtil.ts";
import {hexToRgba} from "../utils/uit.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";

export class EdgeGlowEffect implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<EdgeGlowEffect> = PacketCodecs.of(
        (writer, value) => {
            writer.writeString(value.color);
            writer.writeUint16(value.thickness);
            writer.writeFloat(value.intensity);
            writer.writeFloat(value.duration);
            writer.writeByte(encodeToByte(value.fadeIn, 1));
            writer.writeByte(encodeToByte(value.fadeOut, 1));
            writer.writeByte(value.pulse ? 1 : 0);
            writer.writeString(value.composite);
        },
        reader => {
            return new EdgeGlowEffect(
                reader.readString(),
                reader.readUint16(),
                reader.readFloat(),
                reader.readFloat(),
                decodeFromByte(reader.readUnsignByte(), 1),
                decodeFromByte(reader.readUnsignByte(), 1),
                reader.readByte() !== 0,
                reader.readString() as GlobalCompositeOperation
            );
        }
    );

    private alive = true;
    private t = 0;

    private readonly color: string;
    private readonly thickness: number;
    private readonly intensity: number;
    private readonly duration: number;
    private readonly fadeIn: number;
    private readonly fadeOut: number;
    private readonly pulse: boolean;
    private readonly composite: GlobalCompositeOperation;

    public constructor(
        color = '#5ec8ff',
        thickness = 48,
        intensity = 0.8,
        duration = 0.5,
        fadeIn = 0.06,
        fadeOut = 0.2,
        pulse = false,
        composite: GlobalCompositeOperation = 'lighter',
    ) {
        this.color = color;
        this.thickness = thickness;
        this.intensity = intensity;
        this.duration = duration;
        this.fadeIn = fadeIn;
        this.fadeOut = fadeOut;
        this.pulse = pulse;
        this.composite = composite;
    }

    public tick(dt: number) {
        if (!this.alive) return;
        this.t += dt;
        if (isFinite(this.duration!) && this.t >= this.duration!) {
            this.alive = false;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;

        const tMat = ctx.getTransform();
        // 将平移归零，但保留缩放（DPR）
        ctx.save();
        ctx.setTransform(tMat.a, tMat.b, tMat.c, tMat.d, 0, 0);

        const sx = tMat.a || 1;
        const sy = tMat.d || 1;
        const W = ctx.canvas.width / sx;
        const H = ctx.canvas.height / sy;

        const alpha = this.currentAlpha();
        if (alpha <= 0) {
            ctx.restore();
            return;
        }

        const th = Math.max(1, this.thickness);

        ctx.globalCompositeOperation = this.composite;
        ctx.globalAlpha = 1;

        // 上
        this.linearGlow(ctx, 0, 0, W, th, this.color, alpha, "vertical");
        // 下
        this.linearGlow(ctx, 0, H - th, W, th, this.color, alpha, "vertical-rev");
        // 左
        this.linearGlow(ctx, 0, 0, th, H, this.color, alpha, "horizontal");
        // 右
        this.linearGlow(ctx, W - th, 0, th, H, this.color, alpha, "horizontal-rev");

        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    private currentAlpha(): number {
        let env = 1;
        if (isFinite(this.duration)) {
            if (this.t < this.fadeIn) {
                const u = this.t / this.fadeIn;
                env = u * u * (3 - 2 * u); // smoothstep
            } else if (this.t > this.duration - this.fadeOut) {
                const u = Math.max(0, (this.duration - this.t) / this.fadeOut);
                env = u * u * (3 - 2 * u);
            } else {
                env = 1;
            }
        }

        const pulseMul = this.pulse ? (0.85 + 0.15 * Math.sin(this.t * 2 * Math.PI * 2)) : 1;
        return Math.max(0, Math.min(1, this.intensity * env * pulseMul));
    }

    private linearGlow(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, w: number, h: number,
        color: string, a: number,
        dir: "vertical" | "vertical-rev" | "horizontal" | "horizontal-rev"
    ) {
        let grad: CanvasGradient;
        switch (dir) {
            case "vertical":
                grad = ctx.createLinearGradient(0, y, 0, y + h);
                grad.addColorStop(0, hexToRgba(color, a));
                grad.addColorStop(1, hexToRgba(color, 0));
                break;
            case "vertical-rev":
                grad = ctx.createLinearGradient(0, y, 0, y + h);
                grad.addColorStop(0, hexToRgba(color, 0));
                grad.addColorStop(1, hexToRgba(color, a));
                break;
            case "horizontal":
                grad = ctx.createLinearGradient(x, 0, x + w, 0);
                grad.addColorStop(0, hexToRgba(color, a));
                grad.addColorStop(1, hexToRgba(color, 0));
                break;
            case "horizontal-rev":
                grad = ctx.createLinearGradient(x, 0, x + w, 0);
                grad.addColorStop(0, hexToRgba(color, 0));
                grad.addColorStop(1, hexToRgba(color, a));
                break;
        }
        ctx.fillStyle = grad!;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
    }

    public getType(): VisualEffectType<EdgeGlowEffect> {
        return VisualEffectTypes.EDGE_GLOW;
    }
}
