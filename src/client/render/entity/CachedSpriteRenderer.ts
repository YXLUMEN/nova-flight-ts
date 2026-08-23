import type {Entity} from "../../../entity/Entity.ts";
import type {EntityRenderer} from "./EntityRenderer.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import type {RenderCache, SpriteCtx} from "./RenderCache.ts";

export abstract class CachedSpriteRenderer<E extends Entity> implements EntityRenderer<E> {
    private readonly cache: RenderCache;

    protected constructor(cache: RenderCache) {
        this.cache = cache;
    }

    public render(entity: E, ctx: CanvasRenderingContext2D, alpha: number): void {
        const {x, y} = this.getAnchor(entity, alpha);

        const width = this.width(entity);
        const height = this.height(entity);

        const sprite = this.cache.get(
            this.spriteKey(entity),
            width,
            height,
            this.drawSprite,
            entity,
        );

        ctx.save();
        ctx.translate(x, y);
        this.applyTransform(ctx, entity, alpha);
        ctx.drawImage(
            sprite,
            -width / 2, -height / 2,
            width, height
        );
        ctx.restore();
    }

    protected getAnchor(entity: E, alpha: number): Vec2 {
        return entity.getLerpPos(alpha);
    }

    protected abstract drawSprite(ctx: SpriteCtx, entity: E): void;

    protected abstract spriteKey(entity: E): number;

    protected applyTransform(_ctx: CanvasRenderingContext2D, _entity: E, _alpha: number): void {
    }

    protected abstract width(entity: E): number;

    protected abstract height(entity: E): number;

    public clearCache() {
        this.cache.clear();
    }
}

