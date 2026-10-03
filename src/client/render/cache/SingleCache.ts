import {buildSprite, type RenderCache, type SpriteRender} from "./RenderCache.ts";
import type {AABB} from "../../../utils/math/AABB.ts";

export class SingleCache<K> implements RenderCache<K> {
    private sprite: ImageBitmap | null = null;

    public get<U extends unknown[]>(
        _key: K,
        bounds: AABB,
        draw: SpriteRender<U>,
        ...args: U
    ): ImageBitmap {
        if (this.sprite) return this.sprite;

        this.sprite = buildSprite(bounds, draw, ...args);
        return this.sprite;
    }

    public clear() {
        this.sprite?.close();
        this.sprite = null;
    }
}
