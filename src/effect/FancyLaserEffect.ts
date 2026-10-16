import {LaserBeamEffect} from "./LaserBeamEffect.ts";
import {TAU} from "../utils/math/math.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";
import type {BinaryReader} from "../serialization/BinaryReader.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";

export class FancyLaserEffect extends LaserBeamEffect {
    public static readonly PACKET_CODEC: PacketCodec<FancyLaserEffect> = PacketCodecs.of(this.write, this.read);

    protected static read(reader: BinaryReader) {
        const laser = new FancyLaserEffect(
            PacketCodecs.COLOR_HEX.decode(reader),
            reader.readVarUint(),
            reader.readFloat(),
        );
        laser.reset(PacketCodecs.VECTOR2D.decode(reader), PacketCodecs.VECTOR2D.decode(reader));
        return laser;
    }

    public override render(ctx: CanvasRenderingContext2D) {
        const a = Math.max(0, this.age / this.life);

        ctx.save();
        ctx.globalAlpha = 0.25 + a * 0.75;
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = this.baseWidth + 4 * (0.5 + a * 0.5);
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = '#f4ffff';
        ctx.lineWidth = this.baseWidth + 1.2;
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();

        const pulse = 0.9 + 0.1 * Math.sin(this.pulseTime * 20);
        ctx.strokeStyle = this.baseWidth + this.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(this.end.x, this.end.y, pulse, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }

    public override getType(): VisualEffectType<LaserBeamEffect> {
        return VisualEffectTypes.FANCY_LASER;
    }
}