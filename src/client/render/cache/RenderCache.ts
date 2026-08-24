import type {BiConsumer} from "../../../type/types.ts";
import type {SpriteCtx} from "./LRURenderCache.ts";
import type {AABB} from "../../../utils/math/AABB.ts";
import {DPR} from "../../../utils/uit.ts";

export interface RenderCache<K> {
    get<E>(
        key: K,
        bounds: AABB,
        draw: BiConsumer<SpriteCtx, E>,
        target: E
    ): ImageBitmap;

    clear(): void;
}

/**
 * 按内容包围盒构建位图。
 * 位图内容从 (0,0) 排起（贴图标准存储），锚点偏移由 bounds 表达：
 *   - 构建：translate(-bounds.minX, -bounds.minY) 使内容左上角贴位图原点；
 *   - 渲染：drawImage(bounds.minX, bounds.minY, w, h) 把内容画回锚点。
 * bounds 必须包含线宽/阴影/发光等一切可见延伸，否则会裁剪。
 */
export function buildSprite<E>(
    bounds: AABB,
    draw: BiConsumer<SpriteCtx, E>,
    target: E,
): ImageBitmap {
    const canvas = new OffscreenCanvas(
        Math.ceil(bounds.getWidth() * DPR),
        Math.ceil(bounds.getHeight() * DPR),
    );
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);
    ctx.translate(-bounds.minX, -bounds.minY);
    draw(ctx, target);
    return canvas.transferToImageBitmap();
}
