import {type VisualEffect} from "./VisualEffect.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {clamp} from "../utils/math/math.ts";

export class WindowOverlay implements VisualEffect {
    public static TYPE: VisualEffectType<WindowOverlay> = null!;
    public static readonly PACKET_CODEC: PacketCodec<WindowOverlay> = PacketCodecs.of(
        (writer, value) => {
            PacketCodecs.COLOR_HEX.encode(writer, value.color);
            writer.writeFloat(value.maxAlpha);
            writer.writeFloat(value.fadeIn);
            writer.writeFloat(value.fadeOut);
            writer.writeString(value.composite);
        },
        reader => {
            return new WindowOverlay(
                PacketCodecs.COLOR_HEX.decode(reader),
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
    private state: OverlayState = OverlayState.IN;
    private t = 0;

    public constructor(
        color: string,
        maxAlpha: number = 0.28,           // 遮罩峰值透明度(0~1)
        fadeIn: number = 0.15,             // 淡入时长(s)
        fadeOut: number = 0.15,            // 淡出时长(s)
        composite: GlobalCompositeOperation = 'screen' // 混合模式
    ) {
        this.color = color;
        this.maxAlpha = clamp(maxAlpha, 0, 1);
        this.fadeIn = Math.max(0, fadeIn);
        this.fadeOut = Math.max(0, fadeOut);
        this.composite = composite;
    }

    public getType(): VisualEffectType<WindowOverlay> {
        return WindowOverlay.TYPE;
    }

    public tick(dt: number): void {
        if (!this.alive) return;
        this.t += dt;

        if (this.state === OverlayState.IN) {
            if (this.fadeIn <= 0) {
                this.alpha = this.maxAlpha;
                this.state = OverlayState.STEADY;
                this.t = 0;
                return;
            }

            const k = Math.min(1, this.t / this.fadeIn);
            this.alpha = this.maxAlpha * k;
            if (k >= 1) {
                this.state = OverlayState.STEADY;
                this.t = 0;
            }
            return;
        }

        if (this.state === OverlayState.OUT) {
            if (this.fadeOut <= 0) {
                this.alpha = 0;
                this.alive = false;
                return;
            }

            const k = Math.min(1, this.t / this.fadeOut);
            this.alpha = this.maxAlpha * (1 - k);
            if (k >= 1) this.alive = false;
            return;
        }

        this.alpha = this.maxAlpha;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.alive || this.alpha <= 0) return;

        ctx.save();
        ctx.resetTransform();
        ctx.globalCompositeOperation = this.composite;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    public isAlive(): boolean {
        return this.alive;
    }

    public kill() {
        this.alive = false;
    }

    public end(): void {
        if (this.state === OverlayState.OUT) return;
        this.state = OverlayState.OUT;
        this.t = 0;
    }
}

const enum OverlayState {
    IN,
    STEADY,
    OUT,
}