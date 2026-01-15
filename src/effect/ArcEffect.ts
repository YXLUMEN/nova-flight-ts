import type {VisualEffect} from "./VisualEffect.ts";
import {hexToRgba} from "../utils/uit.ts";
import type {VisualEffectType} from "./VisualEffectType.ts";
import {VisualEffectTypes} from "./VisualEffectTypes.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";

export class ArcEffect implements VisualEffect {
    public static readonly PACKET_CODEC: PacketCodec<ArcEffect> = PacketCodecs.of(
        (writer, value) => {
            writer.writeFloat(value.startX);
            writer.writeFloat(value.startY);
            writer.writeFloat(value.endX);
            writer.writeFloat(value.endY);

            writer.writeFloat(value.lifetime);
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

    private readonly lifetime: number;
    private age: number = 0;

    private readonly arcCount: number;
    private readonly segments: number;
    private readonly color: string;
    private readonly width: number;

    private cachedArcs: { x: number; y: number }[][] = [];

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

        this.lifetime = duration;
        this.width = width;
        this.color = color;
        this.arcCount = arcCount;
        this.segments = segments;

        this.rebuildArcs();
    }

    public getType(): VisualEffectType<ArcEffect> {
        return VisualEffectTypes.ARC;
    }

    public tick(tickDelta: number) {
        this.age += tickDelta;
    }

    public render(ctx: CanvasRenderingContext2D) {
        const progress = this.age / this.lifetime;
        const alpha = 1.0 - progress;

        ctx.save();
        ctx.strokeStyle = hexToRgba(this.color, alpha);
        ctx.lineWidth = this.width;

        ctx.beginPath();
        for (const points of this.cachedArcs) {
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    public isAlive(): boolean {
        return this.age < this.lifetime;
    }

    public kill() {
        this.age = this.lifetime;
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
            const points = [{x: this.startX, y: this.startY}];
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

                points.push({
                    x: baseX + offsetX,
                    y: baseY + offsetY
                });
            }

            points.push({x: this.endX, y: this.endY});
            this.cachedArcs.push(points);
        }
    }
}