import type {VisualEffect} from "./VisualEffect.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {isClient} from "../configs/RuntimeConfig.ts";

export class ArcEffect implements VisualEffect {
    public static TYPE: VisualEffectType<ArcEffect> = null!;
    public static readonly PACKET_CODEC: PacketCodec<ArcEffect> = PacketCodecs.of(
        (writer, value) => {
            writer.writeFloat(value.startX);
            writer.writeFloat(value.startY);
            writer.writeFloat(value.endX);
            writer.writeFloat(value.endY);

            writer.writeFloat(value.duration);
            writer.writeVarUint(value.width);
            PacketCodecs.COLOR_HEX.encode(writer, value.color);
            writer.writeVarUint(value.arcCount);
            writer.writeVarUint(value.segments);
        },
        reader => {
            return new ArcEffect(
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat(),

                reader.readFloat(),
                reader.readVarUint(),
                PacketCodecs.COLOR_HEX.decode(reader),
                reader.readVarUint(),
                reader.readVarUint()
            );
        }
    );

    private readonly startX: number;
    private readonly startY: number;
    private readonly endX: number;
    private readonly endY: number;

    private readonly duration: number;
    private age: number = 0;

    private readonly arcCount: number;
    private readonly segments: number;
    private readonly color: string;
    private readonly width: number;

    private cachedArcs: number[][] = [];

    public constructor(
        x: number, y: number, tx: number, ty: number,
        duration: number = 2,
        width: number = 2,
        color: string = '#8af',
        arcCount: number = 3,
        segments: number = 30,
    ) {
        this.startX = x;
        this.startY = y;
        this.endX = tx;
        this.endY = ty;

        this.duration = duration;
        this.width = width;
        this.color = color;
        this.arcCount = arcCount;
        this.segments = segments;

        if (isClient) this.rebuildArcs();
    }

    public getType(): VisualEffectType<ArcEffect> {
        return ArcEffect.TYPE;
    }

    public tick(tickDelta: number) {
        this.age += tickDelta;
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = 1.0 - (this.age / this.duration || 1);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;

        ctx.beginPath();
        for (const points of this.cachedArcs) {
            ctx.moveTo(points[0], points[1]);
            for (let i = 2; i < points.length; i += 2) {
                ctx.lineTo(points[i], points[i + 1]);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    public isAlive(): boolean {
        return this.age < this.duration;
    }

    public kill() {
        this.age = this.duration;
    }

    private rebuildArcs(): void {
        this.cachedArcs = [];
        const dx = this.endX - this.startX;
        const dy = this.endY - this.startY;
        const len = Math.hypot(dx, dy);
        if (len === 0) return;

        const perpX = -dy / len; // 垂直单位向量
        const perpY = dx / len;

        for (let arc = 0; arc < this.arcCount; arc++) {
            const points = [this.startX, this.startY];
            let currentOffset = 0;

            // 用“累积随机偏移”制造连续弯曲
            for (let i = 1; i < this.segments; i++) {
                const t = i / this.segments;

                // 锥形约束
                const envelope = t * (1 - t) * 4; // 0→1→0
                const targetOffset = (Math.random() * 2 - 1) * 30 * envelope;

                // 平滑过渡到目标偏移
                currentOffset = currentOffset * 0.7 + targetOffset * 0.3;

                const baseX = this.startX + dx * t;
                const baseY = this.startY + dy * t;

                const offsetX = perpX * currentOffset;
                const offsetY = perpY * currentOffset;

                points.push(baseX + offsetX, baseY + offsetY);
            }

            points.push(this.endX, this.endY);
            this.cachedArcs.push(points);
        }
    }
}