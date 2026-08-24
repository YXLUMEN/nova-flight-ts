import {buildSprite, type RenderCache} from "./RenderCache.ts";
import type {BiConsumer} from "../../../type/types.ts";
import type {AABB} from "../../../utils/math/AABB.ts";
import type {SpriteCtx} from "./LRURenderCache.ts";

export class SingleCache<K> implements RenderCache<K> {
    private sprite: ImageBitmap | null = null;

    public get<E>(
        _key: K,
        bounds: AABB,
        draw: BiConsumer<SpriteCtx, E>,
        target: E
    ): ImageBitmap {
        if (this.sprite) return this.sprite;

        this.sprite = buildSprite(bounds, draw, target);
        return this.sprite;
    }

    public clear() {
        this.sprite?.close();
        this.sprite = null;
    }
}
