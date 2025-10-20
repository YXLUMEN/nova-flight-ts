import {type VisualEffect} from "./VisualEffect.ts";
import {lerp, PI2} from "../utils/math/math.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {withAlpha} from "../utils/uit.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {decodeFromByte, encodeToByte} from "../utils/NetUtil.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";

export class EMPBurst implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<EMPBurst> = PacketCodecs.of(
        (writer, value) => {
            PacketCodecs.VECTOR2D.encode(writer, value.pos);
            writer.writeUint16(value.radius);
            writer.writeFloat(value.duration);
            writer.writeByte(value.bolts);
            writer.writeByte(value.segs);
            writer.writeString(value.color);
            writer.writeByte(value.thickness);
            writer.writeByte(encodeToByte(value.jitter, 1));
            writer.writeByte(value.glow);
        },
        reader => {
            return new EMPBurst(
                PacketCodecs.VECTOR2D.decode(reader),
                reader.readUint16(),
                reader.readFloat(),
                reader.readUnsignByte(),
                reader.readUnsignByte(),
                reader.readString(),
                reader.readUnsignByte(),
                decodeFromByte(reader.readUnsignByte(), 1),
                reader.readUnsignByte()
            );
        }
    );

    private alive = true;
    private preT = 0;
    private t = 0;

    private pos: IVec;
    private readonly radius: number;
    private readonly duration: number;
    private readonly bolts: number;
    private readonly segs: number;
    private readonly color: string;
    private readonly thickness: number;
    private readonly jitter: number;
    private readonly glow: number;
    private readonly drawRing: boolean;

    public constructor(
        pos: IVec,
        radius: number,
        duration = 0.6,
        bolts = 8,
        segs = 12,
        color = '#66ccff',
        thickness = 2,
        jitter = 0.9,
        glow = 12,
        drawRing = true
    ) {
        this.drawRing = drawRing;
        this.glow = glow;
        this.jitter = jitter;
        this.thickness = thickness;
        this.color = color;
        this.segs = segs;
        this.bolts = bolts;
        this.duration = duration;
        this.radius = radius;
        this.pos = pos;
    }

    public tick(dt: number): void {
        if (!this.alive) return;
        this.preT = this.t;
        this.t += dt;
        if (this.t >= this.duration) this.alive = false;
    }

    public render(ctx: CanvasRenderingContext2D, tickDelta: number): void {
        if (!this.alive) return;

        const lerpT = lerp(tickDelta, this.preT, this.t);
        const p = lerpT / this.duration;
        const easeOut = 1 - (1 - p) * (1 - p);
        const rNow = this.radius * easeOut;
        const alpha = 1 - p;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.glow;

        // 冲击环
        if (this.drawRing) {
            ctx.strokeStyle = withAlpha(this.color, alpha * 0.6);
            ctx.lineWidth = 6 * (1 - p * 0.5);
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, rNow, 0, PI2);
            ctx.stroke();
        }

        // 电弧
        for (let b = 0; b < this.bolts; b++) {
            const a = (b / this.bolts) * PI2 + (Math.random() - 0.5) * 0.3;
            ctx.lineWidth = this.thickness;
            ctx.strokeStyle = withAlpha(this.color, alpha);

            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            for (let s = 1; s <= this.segs; s++) {
                const tSeg = s / this.segs;
                const r = rNow * tSeg;
                const off = (Math.random() - 0.5) * this.jitter * (this.radius * 0.1) * (1 - p);
                const nx = Math.cos(a), ny = Math.sin(a);
                const px = -ny, py = nx;
                const x = this.pos.x + nx * r + px * off;
                const y = this.pos.y + ny * r + py * off;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    public getType(): VisualEffectType<EMPBurst> {
        return VisualEffectTypes.EMP_BURST;
    }
}
