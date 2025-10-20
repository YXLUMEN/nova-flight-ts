import {type VisualEffect} from "./VisualEffect.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";

export class WindowOverlay implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<WindowOverlay> = PacketCodecs.of(
        (writer, value) => {
            writer.writeString(value.color);
            writer.writeFloat(value.maxAlpha);
            writer.writeFloat(value.fadeIn);
            writer.writeFloat(value.fadeOut);
            writer.writeString(value.composite);
        },
        reader => {
            return new WindowOverlay(
                reader.readString(),
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat(),
                reader.readString() as GlobalCompositeOperation
            );
        }
    );

    private alive = true;

    private readonly color: string;
    private readonly composite: GlobalCompositeOperation;
    private readonly maxAlpha: number;
    private readonly fadeIn: number;
    private readonly fadeOut: number;

    private alpha = 0;
    private state: "in" | "steady" | "out" = "in";
    private t = 0;

    public constructor(
        color: string,
        maxAlpha: number = 0.28,           // 遮罩峰值透明度(0~1)
        fadeIn: number = 0.15,             // 淡入时长(s)
        fadeOut: number = 0.15,            // 淡出时长(s)
        composite: GlobalCompositeOperation = 'screen' // 混合模式
    ) {
        this.color = color;
        this.maxAlpha = maxAlpha ?? 0.28;
        this.fadeIn = Math.max(0, fadeIn);
        this.fadeOut = Math.max(0, fadeOut);
        this.composite = composite;
    }

    public tick(dt: number): void {
        if (!this.alive) return;
        this.t += dt;

        if (this.state === "in") {
            if (this.fadeIn <= 0) {
                this.alpha = this.maxAlpha;
                this.state = "steady";
                this.t = 0;
            } else {
                const k = Math.min(1, this.t / this.fadeIn);
                this.alpha = this.maxAlpha * k;
                if (k >= 1) {
                    this.state = "steady";
                    this.t = 0;
                }
            }
        } else if (this.state === "out") {
            if (this.fadeOut <= 0) {
                this.alpha = 0;
                this.alive = false;
            } else {
                const k = Math.min(1, this.t / this.fadeOut);
                this.alpha = this.maxAlpha * (1 - k);
                if (k >= 1) this.alive = false;
            }
        } else {
            this.alpha = this.maxAlpha;
        }
    }

    public end(): void {
        if (this.state === "out") return;
        this.state = "out";
        this.t = 0;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.alive || this.alpha <= 0) return;

        const canvas = ctx.canvas;
        ctx.save();

        ctx.resetTransform();
        ctx.globalCompositeOperation = this.composite;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    public getType(): VisualEffectType<WindowOverlay> {
        return VisualEffectTypes.WINDOW_OVERLAY;
    }
}
