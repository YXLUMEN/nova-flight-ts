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
            const flag = value.modifiedFlag();
            writer.writeVarUint(flag);

            PacketCodecs.VECTOR2D.encode(writer, value.pos);
            writer.writeUint16(value.radius);

            if (flag & 1 << 0) writer.writeFloat(value.duration);
            if (flag & 1 << 1) writer.writeInt8(value.bolts);
            if (flag & 1 << 2) writer.writeInt8(value.segs);
            if (flag & 1 << 3) PacketCodecs.COLOR_HEX.encode(writer, value.color);
            if (flag & 1 << 4) writer.writeInt8(value.thickness);
            if (flag & 1 << 5) writer.writeInt8(encodeToByte(value.jitter, 1));
            if (flag & 1 << 6) writer.writeInt8(value.glow);
            if (flag & 1 << 7) writer.writeBoolean(value.drawRing);
        },
        reader => {
            const flag = reader.readVarUint();

            return new EMPBurst(
                PacketCodecs.VECTOR2D.decode(reader),
                reader.readUint16(),
                (flag & 1 << 0) ? reader.readFloat() : undefined,
                (flag & 1 << 1) ? reader.readUint8() : undefined,
                (flag & 1 << 2) ? reader.readUint8() : undefined,
                (flag & 1 << 3) ? PacketCodecs.COLOR_HEX.decode(reader) : undefined,
                (flag & 1 << 4) ? reader.readUint8() : undefined,
                (flag & 1 << 5) ? decodeFromByte(reader.readUint8(), 1) : undefined,
                (flag & 1 << 6) ? reader.readUint8() : undefined,
                (flag & 1 << 7) ? reader.readBoolean() : undefined,
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

    public modifiedFlag(): number {
        let flag = 0;
        if (this.duration !== 0.6) flag |= 1 << 0;
        if (this.bolts !== 8) flag |= 1 << 1;
        if (this.segs !== 12) flag |= 1 << 2;
        if (this.color !== '#66ccff') flag |= 1 << 3;
        if (this.thickness !== 2) flag |= 1 << 4;
        if (this.jitter !== 0.9) flag |= 1 << 5;
        if (this.glow != 12) flag |= 1 << 6;
        if (!this.drawRing) flag |= 1 << 7;
        return flag;
    }
}
