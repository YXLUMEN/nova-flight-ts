import {type BaseEnemy} from "../../../entity/mob/BaseEnemy.ts";
import {HALF_PI} from "../../../utils/math/math.ts";
import {CachedSpriteRenderer} from "./CachedSpriteRenderer.ts";
import {stringHashCode} from "../../../utils/hash.ts";
import {RenderCache} from "./RenderCache.ts";

export class BaseEnemyRender extends CachedSpriteRenderer<BaseEnemy> {
    public constructor() {
        super(new RenderCache(16));
    }

    protected drawSprite(ctx: CanvasRenderingContext2D, entity: BaseEnemy) {
        ctx.fillStyle = entity.color;
        ctx.strokeStyle = 'rgba(0,0,0,.2)';

        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(14, 6);
        ctx.lineTo(0, 12);
        ctx.lineTo(-14, 6);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
    }

    protected spriteKey(entity: BaseEnemy): number {
        return stringHashCode(entity.color);
    }

    protected applyTransform(ctx: CanvasRenderingContext2D, entity: BaseEnemy, alpha: number) {
        ctx.rotate(entity.getLerpYaw(alpha) + HALF_PI);
    }

    protected width(): number {
        return 28;
    }

    protected height(): number {
        return 36;
    }
}