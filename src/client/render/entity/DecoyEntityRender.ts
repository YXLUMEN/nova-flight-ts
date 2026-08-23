import {type DecoyEntity} from "../../../entity/DecoyEntity.ts";
import {PI2} from "../../../utils/math/math.ts";
import {CachedSpriteRenderer} from "./CachedSpriteRenderer.ts";
import {RenderCache, type SpriteCtx} from "./RenderCache.ts";

export class DecoyEntityRender extends CachedSpriteRenderer<DecoyEntity> {
    private static readonly PHASE_BUCKETS = 8;
    private static readonly PULSE_PERIOD = PI2 / 0.25;

    public constructor() {
        super(new RenderCache(32));
    }

    protected drawSprite(ctx: SpriteCtx, entity: DecoyEntity): void {
        const pulsePeriod = DecoyEntityRender.PULSE_PERIOD;
        const phaseBuckets = DecoyEntityRender.PHASE_BUCKETS;

        const phase = Math.floor((entity.age % pulsePeriod) / pulsePeriod * phaseBuckets);
        const pulse = 1 + Math.sin(phase / phaseBuckets * PI2) * 0.1;

        const size = entity.getWidth();
        const glowColor = 'rgba(255,254,183,0.8)';

        ctx.scale(pulse, pulse);

        // 渐变描边
        const gradient = ctx.createLinearGradient(-size, -size, size, size);
        gradient.addColorStop(0, 'rgba(255,255,200,0.2)');
        gradient.addColorStop(0.5, glowColor);
        gradient.addColorStop(1, 'rgba(255,255,200,0.2)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;

        // 十字形
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size);
        ctx.stroke();

        // 中心发光圆
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.6);
        coreGradient.addColorStop(0, 'rgba(255,255,200,1)');
        coreGradient.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, PI2);
        ctx.fill();
    }

    protected spriteKey(entity: DecoyEntity): number {
        const pulsePeriod = DecoyEntityRender.PULSE_PERIOD;
        const phaseBuckets = DecoyEntityRender.PHASE_BUCKETS;

        const phase = Math.floor((entity.age % pulsePeriod) / pulsePeriod * phaseBuckets);
        return (entity.getWidth() * 31 + phase) | 0;
    }

    protected applyTransform(ctx: CanvasRenderingContext2D, entity: DecoyEntity,) {
        ctx.rotate(entity.age * 0.02);
    }

    protected width(): number {
        return 12;
    }

    protected height(): number {
        return 12;
    }
}