import {type RocketEntity} from "../../../entity/projectile/RocketEntity.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {type SpriteCtx} from "../cache/LRURenderCache.ts";
import {MapRenderCache} from "../cache/MapRenderCache.ts";

export class RocketEntityRender extends CachedSpriteRenderer<number, RocketEntity> {
    private readonly bounding = new AABB(-7, -8, 10, 8);

    public constructor() {
        super(new MapRenderCache(16));
    }

    protected drawSprite(ctx: SpriteCtx, entity: RocketEntity): void {
        ctx.fillStyle = entity.color.color;
        ctx.strokeStyle = 'rgba(0,0,0,.2)';

        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-3, 7);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-3, -7);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
    }

    protected spriteKey(entity: RocketEntity): number {
        return entity.color.hex;
    }

    protected transform(ctx: CanvasRenderingContext2D, entity: RocketEntity, alpha: number) {
        super.transform(ctx, entity, alpha);
        ctx.rotate(entity.getLerpYaw(alpha));
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}
