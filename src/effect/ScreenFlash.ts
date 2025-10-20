import {type VisualEffect} from "./VisualEffect.ts";
import {Window} from "../client/render/Window.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";

export class ScreenFlash implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<ScreenFlash> = PacketCodecs.of(
        (writer, value) => {
            writer.writeFloat(value.life);
            writer.writeFloat(value.maxAlpha);
            writer.writeString(value.color);
        },
        reader => {
            return new ScreenFlash(
                reader.readFloat(),
                reader.readFloat(),
                reader.readString()
            );
        }
    );

    private alive = true;
    private readonly life: number;
    private readonly maxAlpha: number;
    private readonly color: string;

    private t = 0;

    public constructor(life: number = 0.08, maxAlpha: number = 0.25, color: string = '#ffffff') {
        this.maxAlpha = maxAlpha;
        this.life = life;
        this.color = color;
    }

    public tick(dt: number) {
        this.t += dt;
        if (this.t >= this.life) this.alive = false;
    }

    public render(ctx: CanvasRenderingContext2D) {
        const k = this.t / this.life;
        ctx.save();
        ctx.globalAlpha = (1 - k) * this.maxAlpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, Window.VIEW_W, Window.VIEW_H);
        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    public getType(): VisualEffectType<ScreenFlash> {
        return VisualEffectTypes.SCREEN_FLASH;
    }
}
