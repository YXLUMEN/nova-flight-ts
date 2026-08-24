import {HALF_PI} from "../../../utils/math/math.ts";
import {type RocketEntity} from "../../../entity/projectile/RocketEntity.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {type SpriteCtx} from "../cache/LRURenderCache.ts";
import {MapRenderCache} from "../cache/MapRenderCache.ts";

export class RocketEntityRender extends CachedSpriteRenderer<string, RocketEntity> {
    private readonly bounding = new AABB(-7.5, -9.5, 7.5, 6.5);

    public constructor() {
        super(new MapRenderCache(16));
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

    protected spriteKey(entity: RocketEntity): string {
        return entity.color;
    }

    protected applyTransform(ctx: CanvasRenderingContext2D, entity: RocketEntity, alpha: number) {
        ctx.rotate(entity.getLerpYaw(alpha) + HALF_PI);
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}
