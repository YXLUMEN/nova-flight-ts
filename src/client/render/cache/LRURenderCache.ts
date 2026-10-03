import type {AABB} from "../../../utils/math/AABB.ts";
import {buildSprite, type RenderCache, type SpriteRender} from "./RenderCache.ts";
import {MemoryLRU} from "../../../utils/collection/MemoryLRU.ts";

export class LRURenderCache<K> implements RenderCache<K> {
    private readonly sprites: MemoryLRU<K, ImageBitmap>;

    public constructor(capacity: number = 128) {
        this.sprites = new MemoryLRU(
            capacity,
            (_, val) => val?.close()
        );
    }

    public get<U extends unknown[]>(
        key: K,
        bounds: AABB,
        draw: SpriteRender<U>,
        ...args: U
    ): ImageBitmap {
        const sprite = this.sprites.get(key);
        if (sprite) return sprite;

        const bitmap = buildSprite(bounds, draw, ...args);
        this.sprites.set(key, bitmap);
        return bitmap;
    }

    public clear() {
        this.sprites.clear();
    }
}

export type SpriteCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
