import {type VisualEffect} from "./VisualEffect.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {lerp, PI2} from "../utils/math/math.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";

export class RadialRing implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<RadialRing> = PacketCodecs.of(
        (writer, value) => {
            PacketCodecs.VECTOR2D.encode(writer, value.center);
            writer.writeFloat(value.r0);
            writer.writeFloat(value.r1);
            writer.writeFloat(value.life);
            writer.writeString(value.color);
        },
        reader => {
            return new RadialRing(
                PacketCodecs.VECTOR2D.decode(reader),
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat(),
                reader.readString()
            );
        }
    );

    private alive = true;

    private readonly center: IVec;
    private readonly r0: number;
    private readonly r1: number;
    private readonly life: number;
    private readonly color: string;

    private preT = 0;
    private t = 0;

    public constructor(center: IVec, r0: number, r1: number, life: number, color: string) {
        this.color = color;
        this.life = life;
        this.r1 = r1;
        this.r0 = r0;
        this.center = center;
    }

    public tick(dt: number) {
        this.preT = this.t;
        this.t += dt;
        if (this.t >= this.life) {
            this.alive = false;
        }
    }

    public render(ctx: CanvasRenderingContext2D, tickDelta: number) {
        const lerpT = lerp(tickDelta, this.preT, this.t);
        const k = Math.min(1, lerpT / this.life);
        const r = this.r0 + (this.r1 - this.r0) * k;
        const alpha = 1 - k;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, (this.r1 - this.r0) * 0.04 * (1 - k));
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, r, 0, PI2);
        ctx.stroke();
        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    public getType(): VisualEffectType<RadialRing> {
        return VisualEffectTypes.RADIAL_RING
    }
}
