import {type CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";
import {type SpriteCtx} from "./RenderCache.ts";
import {HALF_PI} from "../../../utils/math/math.ts";
import {SingleCachedSpriteRenderer} from "./SingleCachedSpriteRenderer.ts";

export class CIWSBulletEntityRender extends SingleCachedSpriteRenderer<CIWSBulletEntity> {
    protected drawSprite(ctx: SpriteCtx, entity: CIWSBulletEntity): void {
        const height = 72;

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, entity.color);
        gradient.addColorStop(1, "rgb(0 0 0 / 0)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, height);
        ctx.stroke();
    }

    protected applyTransform(ctx: CanvasRenderingContext2D, entity: CIWSBulletEntity) {
        ctx.rotate(entity.getYaw() + HALF_PI);
    }

    protected height(): number {
        return 72;
    }

    protected width(): number {
        return 3;
    }
}
