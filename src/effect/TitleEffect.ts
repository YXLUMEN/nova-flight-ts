import type {VisualEffect} from "./VisualEffect.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";

export class TitleEffect implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<TitleEffect> = PacketCodecs.of(
        (writer, value) => {
            writer.writeString(value.text);
            writer.writeFloat(value.t);
        },
        reader => new TitleEffect(
            reader.readString(),
            reader.readFloat(),
        )
    );

    private readonly text: string;
    private t: number;

    public constructor(text: string, t: number) {
        this.text = text;
        this.t = t;
    }

    public getType(): VisualEffectType<any> {
        return VisualEffectTypes.TITLE;
    }

    public isAlive(): boolean {
        return this.t > 0;
    }

    public tick(tickDelta: number): void {
        this.t -= tickDelta;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.resetTransform();

        ctx.font = "48px Minecraft";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        ctx.fillText(this.text, centerX, centerY);
        ctx.restore();
    }

    public kill(): void {
        this.t = 0;
    }
}