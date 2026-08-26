import {type ExplodeBulletEntity} from "../../../entity/projectile/ExplodeBulletEntity.ts";
import {HALF_PI} from "../../../utils/math/math.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import type {SpriteCtx} from "../cache/LRURenderCache.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {MapRenderCache} from "../cache/MapRenderCache.ts";

export class ExplodeBulletEntityRender extends CachedSpriteRenderer<number, ExplodeBulletEntity> {
    private readonly bounding = new AABB(-19, -9, 9, 9);

    public constructor() {
        super(new MapRenderCache(8));
    }

    protected drawSprite(ctx: SpriteCtx, entity: ExplodeBulletEntity): void {
        const r = 8;
        const tailLength = 18;

        ctx.fillStyle = entity.color.color;

        ctx.beginPath();
        ctx.arc(0, 0, r, -HALF_PI, HALF_PI, false);
        ctx.lineTo(-tailLength, r);
        ctx.lineTo(-tailLength, -r);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-tailLength + 5, -r);
        ctx.lineTo(-tailLength + 5, r);
        ctx.stroke();
    }

    protected spriteKey(entity: ExplodeBulletEntity): number {
        return entity.color.hex;
    }

    protected transform(ctx: CanvasRenderingContext2D, entity: ExplodeBulletEntity, alpha: number) {
        super.transform(ctx, entity, alpha);
        ctx.rotate(entity.getYaw());
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}