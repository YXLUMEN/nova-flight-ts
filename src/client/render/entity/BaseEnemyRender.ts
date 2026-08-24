import type {BaseEnemy} from "../../../entity/mob/BaseEnemy.ts";
import {HALF_PI} from "../../../utils/math/math.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {MapRenderCache} from "../cache/MapRenderCache.ts";

export class BaseEnemyRender extends CachedSpriteRenderer<string, BaseEnemy> {
    private readonly bounding = new AABB(-15, -19, 15, 13);

    public constructor() {
        super(new MapRenderCache(32));
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

    protected spriteKey(entity: BaseEnemy): string {
        return entity.color;
    }

    protected applyTransform(ctx: CanvasRenderingContext2D, entity: BaseEnemy, alpha: number) {
        ctx.rotate(entity.getLerpYaw(alpha) + HALF_PI);
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}
