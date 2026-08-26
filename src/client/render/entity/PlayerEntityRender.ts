import {type PlayerEntity} from "../../../entity/player/PlayerEntity.ts";

import {type ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import type {SpriteCtx} from "../cache/LRURenderCache.ts";
import {SingleCache} from "../cache/SingleCache.ts";
import {buildSprite} from "../cache/RenderCache.ts";

export class PlayerEntityRender extends CachedSpriteRenderer<number, PlayerEntity> {
    private readonly bounding = new AABB(-17, -15, 21, 15);
    private readonly flameBounding = new AABB(-8, -6, 0, 6);
    private flame: ImageBitmap | null = null;

    public constructor() {
        super(new SingleCache());
    }

    public render(entity: ClientPlayerEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        entity.autoAim?.render();
        super.render(entity, ctx, tickDelta);
    }

    protected drawSprite(ctx: SpriteCtx): void {
        const grad = ctx.createLinearGradient(20, 0, -20, 0);
        grad.addColorStop(0, "#7ee3ff");
        grad.addColorStop(1, "#2aa9ff");
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-8, 14);
        ctx.lineTo(-16, 0);
        ctx.lineTo(-8, -14);
        ctx.closePath();
        ctx.fill();

        // 发光
        ctx.strokeStyle = "rgba(140,245,255,.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    protected spriteKey(): number {
        return 0;
    }

    protected transform(ctx: CanvasRenderingContext2D, entity: PlayerEntity, alpha: number) {
        super.transform(ctx, entity, alpha);
        ctx.rotate(entity.getLerpYaw(alpha));
    }

    protected drawOverlay(ctx: CanvasRenderingContext2D) {
        if (!this.flame) {
            this.flame = buildSprite(
                this.flameBounding,
                (spriteCtx) => {
                    const g = spriteCtx.createLinearGradient(0, 0, -8, 0);
                    g.addColorStop(0, "rgb(255 149 83 / 0.9)");
                    g.addColorStop(1, "rgb(255 200 120 / 0.5)");
                    spriteCtx.fillStyle = g;
                    spriteCtx.beginPath();
                    spriteCtx.moveTo(0, -6);
                    spriteCtx.lineTo(-8, 0);
                    spriteCtx.lineTo(0, 6);
                    spriteCtx.closePath();
                    spriteCtx.fill();
                },
                null
            );
        }

        const len = 8 + Math.random() * 6;
        ctx.drawImage(this.flame, -16 - len, -6, len, 12);
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