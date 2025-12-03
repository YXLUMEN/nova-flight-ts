import {type VisualEffect} from "./VisualEffect.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {lerp} from "../utils/math/math.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import type {IVec} from "../utils/math/IVec.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";

export class LaserBeamEffect implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<LaserBeamEffect> = PacketCodecs.of(
        (writer, value) => {
            writer.writeString(value.color);
            writer.writeVarUInt(value.baseWidth);
            writer.writeFloat(value.life);
            PacketCodecs.VECTOR2D.encode(writer, value.start);
            PacketCodecs.VECTOR2D.encode(writer, value.end);
        },
        reader => {
            const laser = new LaserBeamEffect(
                reader.readString(),
                reader.readVarUInt(),
                reader.readFloat(),
            );
            laser.reset(PacketCodecs.VECTOR2D.decode(reader), PacketCodecs.VECTOR2D.decode(reader));
            return laser;
        }
    );

    private alive = true;

    private readonly color: string;
    private readonly baseWidth: number;
    private readonly life: number;

    private readonly start = MutVec2.zero();
    private readonly end = MutVec2.zero();
    private readonly prevStart = MutVec2.zero();
    private readonly prevEnd = MutVec2.zero();

    private t = 0;
    private pulseTime = 0;

    public constructor(color: string, baseWidth: number, life = 0.15) {
        this.baseWidth = baseWidth;
        this.color = color;
        this.life = life;
    }

    public set(start: IVec, end: IVec) {
        this.prevStart.set(this.start.x, this.start.y);
        this.prevEnd.set(this.end.x, this.end.y);
        this.start.x = start.x;
        this.start.y = start.y;
        this.end.x = end.x;
        this.end.y = end.y;
        this.t = 0; // 刷新寿命,保持常驻
    }

    public reset(start: IVec, end: IVec) {
        this.start.set(start.x, start.y);
        this.end.set(end.x, end.y);
        this.prevStart.set(start.x, start.y);
        this.prevEnd.set(end.x, end.y);
        this.t = 0;
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    public tick(dt: number) {
        this.t += dt;
        this.pulseTime += dt;
        if (this.t > this.life) this.alive = false;
    }

    public render(ctx: CanvasRenderingContext2D, tickDelta: number) {
        if (!this.alive) return;

        const sx = lerp(tickDelta, this.prevStart.x, this.start.x);
        const sy = lerp(tickDelta, this.prevStart.y, this.start.y);
        const ex = lerp(tickDelta, this.prevEnd.x, this.end.x);
        const ey = lerp(tickDelta, this.prevEnd.y, this.end.y);

        const pulse = 0.85 + 0.15 * Math.sin(this.pulseTime * 20);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // 外圈柔光
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = this.baseWidth * 2.4 * pulse;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // 内芯
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = this.baseWidth * pulse;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        ctx.restore();
    }

    public getType(): VisualEffectType<LaserBeamEffect> {
        return VisualEffectTypes.LASER_BEAM;
    }
}
