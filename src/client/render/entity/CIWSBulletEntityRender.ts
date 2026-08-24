import type {CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";
import type {SpriteCtx} from "../cache/LRURenderCache.ts";
import {HALF_PI} from "../../../utils/math/math.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {SingleCache} from "../cache/SingleCache.ts";

export class CIWSBulletEntityRender extends CachedSpriteRenderer<number, CIWSBulletEntity> {
    private readonly bounding = new AABB(-1.5, -1.5, 1.5, 73.5);

    public constructor() {
        super(new SingleCache());
    }

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

    protected spriteKey(): number {
        return 0;
    }

    protected applyTransform(ctx: CanvasRenderingContext2D, entity: CIWSBulletEntity) {
        ctx.rotate(entity.getYaw() + HALF_PI);
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}
