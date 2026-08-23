import {type CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";
import {CachedSpriteRenderer} from "./CachedSpriteRenderer.ts";
import {RenderCache, type SpriteCtx} from "./RenderCache.ts";
import {HALF_PI} from "../../../utils/math/math.ts";

export class CIWSBulletEntityRender extends CachedSpriteRenderer<CIWSBulletEntity> {
    public constructor() {
        super(new RenderCache(8));
    }

    protected drawSprite(ctx: SpriteCtx, entity: CIWSBulletEntity): void {
        const height = 72;

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, entity.color);
        gradient.addColorStop(1, "rgba(255, 200, 100, 0)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, height);
        ctx.stroke();
    }

    protected spriteKey(): number {
        return 0;
    }

    protected applyTransform(ctx: CanvasRenderingContext2D, entity: CIWSBulletEntity) {
        ctx.rotate(entity.getYaw() + HALF_PI);
    }

    protected height(): number {
        return 72;
    }

    protected width(): number {
        return 4;
    }
}
