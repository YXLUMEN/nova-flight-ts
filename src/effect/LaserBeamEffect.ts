import type {VisualEffect} from "./VisualEffect.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import type {Vec2} from "../utils/math/Vec2.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {lerp} from "../utils/math/math.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";
import type {BinaryReader} from "../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../serialization/BinaryWriter.ts";


export class LaserBeamEffect implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<LaserBeamEffect> = PacketCodecs.of(this.write, this.read);

    protected static write(writer: BinaryWriter, value: LaserBeamEffect) {
        PacketCodecs.COLOR_HEX.encode(writer, value.color);
        writer.writeVarUint(value.baseWidth);
        writer.writeFloat(value.life);
        PacketCodecs.VECTOR2D.encode(writer, value.start);
        PacketCodecs.VECTOR2D.encode(writer, value.end);
    }

    protected static read(reader: BinaryReader) {
        const laser = new LaserBeamEffect(
            PacketCodecs.COLOR_HEX.decode(reader),
            reader.readVarUint(),
            reader.readFloat(),
        );
        laser.reset(PacketCodecs.VECTOR2D.decode(reader), PacketCodecs.VECTOR2D.decode(reader));
        return laser;
    }

    protected readonly color: string;
    protected readonly baseWidth: number;
    protected readonly life: number;

    protected readonly start = MutVec2.zero();
    protected readonly end = MutVec2.zero();
    protected readonly prevStart = MutVec2.zero();
    protected readonly prevEnd = MutVec2.zero();

    protected age = 0;
    protected pulseTime = 0;

    public constructor(color: string, baseWidth: number, life = 0.15) {
        this.baseWidth = baseWidth;
        this.color = color;
        this.life = life;
    }

    public getType(): VisualEffectType<LaserBeamEffect> {
        return VisualEffectTypes.LASER_BEAM;
    }

    public tick(dt: number) {
        this.age += dt;
        this.pulseTime += dt;
    }

    public render(ctx: CanvasRenderingContext2D, alpha: number) {
        const sx = lerp(alpha, this.prevStart.x, this.start.x);
        const sy = lerp(alpha, this.prevStart.y, this.start.y);
        const ex = lerp(alpha, this.prevEnd.x, this.end.x);
        const ey = lerp(alpha, this.prevEnd.y, this.end.y);

        const pulse = 0.9 + 0.1 * Math.sin(this.pulseTime * 20);

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

    public shouldRender(): boolean {
        return true;
    }

    public isAlive(): boolean {
        return this.age < this.life;
    }

    public kill() {
        this.age = this.life;
    }

    public setByVec(start: Vec2, end: Vec2) {
        this.prevStart.set(this.start.x, this.start.y);
        this.prevEnd.set(this.end.x, this.end.y);
        this.start.x = start.x;
        this.start.y = start.y;
        this.end.x = end.x;
        this.end.y = end.y;
        this.age = 0; // 刷新寿命,保持常驻
    }

    public set(startX: number, startY: number, endX: number, endY: number) {
        this.prevStart.set(this.start.x, this.start.y);
        this.prevEnd.set(this.end.x, this.end.y);
        this.start.x = startX;
        this.start.y = startY;
        this.end.x = endX;
        this.end.y = endY;
        this.age = 0;
    }

    public reset(start: Vec2, end: Vec2) {
        this.start.set(start.x, start.y);
        this.end.set(end.x, end.y);
        this.prevStart.set(start.x, start.y);
        this.prevEnd.set(end.x, end.y);
        this.age = 0;
    }
}
