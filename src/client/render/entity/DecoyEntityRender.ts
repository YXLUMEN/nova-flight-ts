import type {DecoyEntity} from "../../../entity/DecoyEntity.ts";
import {PI2} from "../../../utils/math/math.ts";
import type {SpriteCtx} from "../cache/LRURenderCache.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {SingleCache} from "../cache/SingleCache.ts";

export class DecoyEntityRender extends CachedSpriteRenderer<number, DecoyEntity> {
    private static readonly PULSE_PERIOD = PI2 / 0.25;
    private readonly bounding = new AABB(-32, -32, 32, 32);

    public constructor() {
        super(new SingleCache());
    }

    protected drawSprite(ctx: SpriteCtx): void {
        const size = 6;
        const glowColor = 'rgba(255,254,183,0.8)';

        ctx.shadowBlur = 25;
        ctx.shadowColor = glowColor;

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

    protected spriteKey(): number {
        return 0;
    }

    protected transform(ctx: CanvasRenderingContext2D, entity: DecoyEntity, alpha: number) {
        super.transform(ctx, entity, alpha);

        const pulse = 1 + Math.sin((entity.age % DecoyEntityRender.PULSE_PERIOD)
            / DecoyEntityRender.PULSE_PERIOD * PI2) * 0.1;

        ctx.rotate(entity.age * 0.02);
        ctx.scale(pulse, pulse);
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}
