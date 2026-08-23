import type {Entity} from "../../../entity/Entity.ts";
import type {EntityRenderer} from "./EntityRenderer.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import type {SpriteCtx} from "./RenderCache.ts";
import {DPR} from "../../../utils/uit.ts";

export abstract class SingleCachedSpriteRenderer<E extends Entity> implements EntityRenderer<E> {
    private sprite: ImageBitmap | null = null;

    public render(entity: E, ctx: CanvasRenderingContext2D, alpha: number): void {
        const {x, y} = this.getAnchor(entity, alpha);

        const width = this.width(entity);
        const height = this.height(entity);

        if (!this.sprite) {
            this.sprite = this.buildSprite(width, height, entity);
        }

        ctx.save();
        ctx.translate(x, y);
        this.applyTransform(ctx, entity, alpha);
        ctx.drawImage(this.sprite, -width / 2, -height / 2, width, height);
        ctx.restore();
    }

    protected getAnchor(entity: E, alpha: number): Vec2 {
        return entity.getLerpPos(alpha);
    }

    protected abstract drawSprite(ctx: SpriteCtx, entity: E): void;

    protected applyTransform(_ctx: CanvasRenderingContext2D, _entity: E, _alpha: number): void {
    }

    // 渲染宽
    protected abstract width(entity: E): number;

    // 渲染长
    protected abstract height(entity: E): number;

    public clearCache() {
        this.sprite?.close();
        this.sprite = null;
    }

    private buildSprite(width: number, height: number, entity: E): ImageBitmap {
        const canvas = new OffscreenCanvas(Math.ceil(width * DPR), Math.ceil(height * DPR));
        const ctx = canvas.getContext('2d')!;
        ctx.scale(DPR, DPR);
        ctx.translate(width / 2, height / 2);
        this.drawSprite(ctx, entity);
        return canvas.transferToImageBitmap();
    }
}
