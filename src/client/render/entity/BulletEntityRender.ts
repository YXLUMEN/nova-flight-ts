import {type BulletEntity} from "../../../entity/projectile/BulletEntity.ts";
import {PI2} from "../../../utils/math/math.ts";
import {CachedSpriteRenderer} from "./CachedSpriteRenderer.ts";
import {stringHashCode} from "../../../utils/hash.ts";
import {RenderCache} from "./RenderCache.ts";

export class BulletEntityRender extends CachedSpriteRenderer<BulletEntity> {
    public constructor() {
        super(new RenderCache(16));
    }

    protected drawSprite(ctx: CanvasRenderingContext2D, entity: BulletEntity): void {
        const r = entity.getDimensions().halfWidth;
        ctx.fillStyle = entity.color;

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, PI2);
        ctx.fill();

        if (entity.edgeColor) {
            ctx.strokeStyle = entity.edgeColor;
            ctx.arc(0, 0, r + 1, 0, PI2);
        }

        ctx.stroke();
    }

    protected spriteKey(entity: BulletEntity): number {
        let hash = entity.getType().hashCode();
        hash = (hash * 31 + stringHashCode(entity.color)) | 0;
        hash = (hash * 31 + stringHashCode(entity.edgeColor)) | 0;
        return hash;
    }

    protected width(entity: BulletEntity): number {
        return entity.getWidth() + 4;
    }

    protected height(entity: BulletEntity): number {
        return entity.getHeight() + 4;
    }
}