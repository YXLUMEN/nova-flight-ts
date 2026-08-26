import type {BaseEnemy} from "../../../entity/mob/BaseEnemy.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {MapRenderCache} from "../cache/MapRenderCache.ts";

export class BaseEnemyRender extends CachedSpriteRenderer<number, BaseEnemy> {
    private readonly bounding = new AABB(-13, -15, 19, 15);

    public constructor() {
        super(new MapRenderCache(32));
    }

    protected drawSprite(ctx: CanvasRenderingContext2D, entity: BaseEnemy) {
        ctx.fillStyle = entity.color.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-6, 14);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-6, -14);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
    }

    protected spriteKey(entity: BaseEnemy): number {
        return entity.color.hex;
    }

    protected transform(ctx: CanvasRenderingContext2D, entity: BaseEnemy, alpha: number) {
        super.transform(ctx, entity, alpha);
        ctx.rotate(entity.getLerpYaw(alpha));
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}
