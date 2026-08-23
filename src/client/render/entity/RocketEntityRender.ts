import {HALF_PI} from "../../../utils/math/math.ts";
import {type RocketEntity} from "../../../entity/projectile/RocketEntity.ts";
import {CachedSpriteRenderer} from "./CachedSpriteRenderer.ts";
import {RenderCache, type SpriteCtx} from "./RenderCache.ts";
import {stringHashCode} from "../../../utils/hash.ts";

export class RocketEntityRender extends CachedSpriteRenderer<RocketEntity> {
    public constructor() {
        super(new RenderCache(8));
    }

    protected drawSprite(ctx: SpriteCtx, entity: RocketEntity): void {
        ctx.fillStyle = entity.color;
        ctx.strokeStyle = 'rgba(0,0,0,.2)';

        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(7, 3);
        ctx.lineTo(0, 6);
        ctx.lineTo(-7, 3);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
    }

    protected spriteKey(entity: RocketEntity): number {
        return stringHashCode(entity.color);
    }

    protected applyTransform(ctx: CanvasRenderingContext2D, entity: RocketEntity, alpha: number) {
        ctx.rotate(entity.getLerpYaw(alpha) + HALF_PI);
    }

    protected width(): number {
        return 14;
    }

    protected height(): number {
        return 16;
    }
}