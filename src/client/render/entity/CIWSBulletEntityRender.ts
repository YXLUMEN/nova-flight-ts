import type {CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";
import type {SpriteCtx} from "../cache/LRURenderCache.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {SingleCache} from "../cache/SingleCache.ts";

export class CIWSBulletEntityRender extends CachedSpriteRenderer<number, CIWSBulletEntity> {
    private readonly bounding = new AABB(-73.5, -1.5, 1.5, 1.5);

    public constructor() {
        super(new SingleCache());
    }

    protected drawSprite(ctx: SpriteCtx): void {
        const length = 72;

        ctx.globalCompositeOperation = 'lighter';

        const glowGrad = ctx.createLinearGradient(0, 0, -length, 0);
        glowGrad.addColorStop(0, 'rgb(255 215 140 / 0.3)');
        glowGrad.addColorStop(0.6, 'rgb(255 209 140 / 0.05)');
        glowGrad.addColorStop(1, 'rgb(0 0 0 / 0)');

        ctx.strokeStyle = glowGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-length * 0.4, 0);
        ctx.stroke();

        const gradient = ctx.createLinearGradient(0, 0, -length, 0);
        gradient.addColorStop(0, '#8cf5ff');
        gradient.addColorStop(1, "rgb(0 0 0 / 0)");

        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-length, 0);
        ctx.stroke();
    }

    protected spriteKey(): number {
        return 0;
    }

    protected transform(ctx: CanvasRenderingContext2D, entity: CIWSBulletEntity, alpha: number) {
        super.transform(ctx, entity, alpha);
        ctx.rotate(entity.getYaw());
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}
