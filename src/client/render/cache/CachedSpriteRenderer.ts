import type {Entity} from "../../../entity/Entity.ts";
import type {EntityRenderer} from "../entity/EntityRenderer.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import type {AABB} from "../../../utils/math/AABB.ts";
import type {SpriteCtx} from "./LRURenderCache.ts";
import type {RenderCache} from "./RenderCache.ts";

export abstract class CachedSpriteRenderer<K, E extends Entity> implements EntityRenderer<E> {
    private readonly cache: RenderCache<K>;

    protected constructor(cache: RenderCache<K>) {
        this.cache = cache;
    }

    public render(entity: E, ctx: CanvasRenderingContext2D, alpha: number): void {
        const {x, y} = this.getAnchor(entity, alpha);
        const bounds = this.bounds(entity);

        const sprite = this.cache.get(
            this.spriteKey(entity),
            bounds,
            this.drawSprite,
            entity,
        );

        ctx.save();
        ctx.translate(x, y);
        this.applyTransform(ctx, entity, alpha);
        ctx.drawImage(
            sprite,
            bounds.minX, bounds.minY,
            bounds.getWidth(), bounds.getHeight(),
        );
        ctx.restore();
    }

    protected getAnchor(entity: E, alpha: number): Vec2 {
        return entity.getLerpPos(alpha);
    }

    protected abstract drawSprite(ctx: SpriteCtx, entity: E): void;

    protected abstract spriteKey(entity: E): K;

    /**
     * 除了坐标变换外所需要应用的变换
     * */
    protected applyTransform(_ctx: CanvasRenderingContext2D, _entity: E, _alpha: number): void {
    }

    /**
     * 内容包围盒（锚点本地坐标）。
     * 构建时内容从位图 (0,0) 排起，渲染时按 minX/minY 画回锚点。
     */
    protected abstract bounds(entity: E): AABB;

    public clearCache() {
        this.cache.clear();
    }
}
