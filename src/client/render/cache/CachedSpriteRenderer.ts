import type {Vec2} from "../../../utils/math/Vec2.ts";
import type {AABB} from "../../../utils/math/AABB.ts";
import type {SpriteCtx} from "./LRURenderCache.ts";
import type {RenderCache} from "./RenderCache.ts";

export abstract class CachedSpriteRenderer<K, V> {
    private readonly cache: RenderCache<K>;

    protected constructor(cache: RenderCache<K>) {
        this.cache = cache;
    }

    public render(target: V, ctx: CanvasRenderingContext2D, alpha: number): void {
        const bounds = this.bounds(target);

        const sprite = this.cache.get(
            this.spriteKey(target),
            bounds,
            this.drawSprite,
            target,
        );

        ctx.save();
        this.transform(ctx, target, alpha);
        ctx.drawImage(
            sprite,
            bounds.minX, bounds.minY,
            bounds.getWidth(), bounds.getHeight(),
        );
        this.drawOverlay(ctx, target, alpha);
        ctx.restore();
    }

    protected abstract getAnchor(target: V, alpha: number): Vec2;

    protected abstract drawSprite(ctx: SpriteCtx, entity: V): void;

    protected abstract spriteKey(entity: V): K;

    /**
     * 除了坐标变换外所需要应用的变换
     * */
    protected transform(ctx: CanvasRenderingContext2D, target: V, alpha: number): void {
        const {x, y} = this.getAnchor(target, alpha);
        ctx.translate(x, y);
    }

    protected drawOverlay(_ctx: CanvasRenderingContext2D, _target: V, _alpha: number): void {
    }

    /**
     * 内容包围盒（锚点本地坐标）。
     * 构建时内容从位图 (0,0) 排起，渲染时按 minX/minY 画回锚点。
     */
    protected abstract bounds(target: V): AABB;

    public clearCache() {
        this.cache.clear();
    }
}
