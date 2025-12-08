import {MutVec2} from "../utils/math/MutVec2.ts";
import {type VisualEffect} from "./VisualEffect.ts";
import {lerp, PI2} from "../utils/math/math.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {
    decodeColorHex,
    decodeFromInt16,
    decodeFromUnsignedByte,
    encodeColorHex,
    encodeToInt16,
    encodeToUnsignedByte
} from "../utils/NetUtil.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";

export class Particle implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<Particle> = PacketCodecs.of(
        (writer, value) => {
            PacketCodecs.VECTOR2D.encode(writer, value.pos);
            PacketCodecs.VECTOR2D.encode(writer, value.vel);
            writer.writeInt8(encodeToUnsignedByte(value.life));
            writer.writeInt16(encodeToInt16(value.size));
            writer.writeUint32(encodeColorHex(value.colorFrom));
            writer.writeUint32(encodeColorHex(value.colorTo));
            writer.writeFloat(value.drag);
            writer.writeFloat(value.gravity);
        },
        reader => {
            return new Particle(
                PacketCodecs.VECTOR2D.decode(reader),
                PacketCodecs.VECTOR2D.decode(reader),
                decodeFromUnsignedByte(reader.readUint8()),
                decodeFromInt16(reader.readInt16()),
                decodeColorHex(reader.readUint32()),
                decodeColorHex(reader.readUint32()),
                reader.readFloat(),
                reader.readFloat(),
            );
        }
    );

    public alive = true;

    private prevPos = MutVec2.zero();
    private pos = MutVec2.zero();
    private vel = MutVec2.zero();
    private life: number;
    private size: number;
    private colorFrom: string;
    private colorTo: string;
    private drag: number;
    private gravity: number;

    private t = 0;

    public constructor(
        pos: IVec, vel: IVec,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ) {
        this.vel.set(vel.x, vel.y);
        this.prevPos.set(pos.x, pos.y);
        this.pos.set(pos.x, pos.y);
        this.gravity = gravity;
        this.drag = drag;
        this.colorTo = colorTo;
        this.colorFrom = colorFrom;
        this.size = Math.max(0, size);
        this.life = Math.max(0, life);
    }

    public reset(
        pos: IVec, vel: IVec,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ) {
        this.vel.set(vel.x, vel.y);
        this.prevPos.set(pos.x, pos.y);
        this.pos.set(pos.x, pos.y);
        this.size = Math.max(0, size);
        this.life = Math.max(0, life);
        this.colorFrom = colorFrom;
        this.colorTo = colorTo;
        this.drag = drag;
        this.gravity = gravity;
        this.t = 0;
        this.alive = true;
    }

    public tick(dt: number) {
        this.t += dt;
        if (this.t >= this.life) {
            this.alive = false;
            return;
        }
        this.vel.x *= (1 - this.drag * dt);
        this.vel.y = this.vel.y * (1 - this.drag * dt) + this.gravity * dt;

        this.prevPos.set(this.pos.x, this.pos.y);
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
    }

    public render(ctx: CanvasRenderingContext2D, tickDelta: number) {
        const x = lerp(tickDelta, this.prevPos.x, this.pos.x);
        const y = lerp(tickDelta, this.prevPos.y, this.pos.y);

        const k = this.t / this.life;
        const r = this.size * (1 - 0.6 * k);

        ctx.globalAlpha = 1 - k;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, this.colorFrom);
        g.addColorStop(1, this.colorTo);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, PI2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    public getType(): VisualEffectType<Particle> {
        return VisualEffectTypes.PARTICLE;
    }
}
