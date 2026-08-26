import type {MissileEntity} from "../../../entity/projectile/MissileEntity.ts";

import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {MapRenderCache} from "../cache/MapRenderCache.ts";
import type {SpriteCtx} from "../cache/LRURenderCache.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {buildSprite} from "../cache/RenderCache.ts";

export class MissileEntityRender extends CachedSpriteRenderer<number, MissileEntity> {
    private readonly bounding = new AABB(-7, -8, 10, 8);
    private readonly flameBounding = new AABB(-4, -3, 0, 3);
    private flame: ImageBitmap | null = null;

    public constructor() {
        super(new MapRenderCache(32));
    }

    protected drawSprite(ctx: SpriteCtx, entity: MissileEntity): void {
        ctx.fillStyle = entity.color.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-3, 7);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-3, -7);
        ctx.closePath();
        ctx.fill();
    }

    protected spriteKey(entity: MissileEntity): number {
        return entity.color.hex;
    }

    protected transform(ctx: CanvasRenderingContext2D, entity: MissileEntity, alpha: number) {
        super.transform(ctx, entity, alpha);
        ctx.rotate(entity.getLerpYaw(alpha));
    }

    protected drawOverlay(ctx: CanvasRenderingContext2D, entity: MissileEntity) {
        if (!entity.isIgnite()) return;

        if (!this.flame) {
            this.flame = buildSprite(
                this.flameBounding,
                (spriteCtx) => {
                    const g = spriteCtx.createLinearGradient(0, 0, -4, 0);
                    g.addColorStop(0, "rgb(255 149 83 / 0.9)");
                    g.addColorStop(1, "rgb(255 200 120 / 0.5)");
                    spriteCtx.fillStyle = g;
                    spriteCtx.beginPath();
                    spriteCtx.moveTo(0, -3);
                    spriteCtx.lineTo(-4, 0);
                    spriteCtx.lineTo(0, 3);
                    spriteCtx.closePath();
                    spriteCtx.fill();
                },
                null
            );
        }

        const len = 4 + Math.random() * 4;
        ctx.drawImage(this.flame, -6 - len, -3, len, 6);
    }

    protected bounds(): AABB {
        return this.bounding;
    }

    public override clearCache() {
        super.clearCache();
        this.flame?.close();
        this.flame = null;
    }
}