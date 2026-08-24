import {MemoryLRU} from "../../../utils/collection/MemoryLRU.ts";
import type {BiConsumer} from "../../../type/types.ts";
import type {AABB} from "../../../utils/math/AABB.ts";
import {buildSprite, type RenderCache} from "./RenderCache.ts";

export class LRURenderCache<K> implements RenderCache<K> {
    private readonly sprites: MemoryLRU<K, ImageBitmap>;

    public constructor(capacity: number = 128) {
        this.sprites = new MemoryLRU(
            capacity,
            (val) => val.value?.close()
        );
    }

    public get<E>(
        key: K,
        bounds: AABB,
        draw: BiConsumer<SpriteCtx, E>,
        target: E
    ): ImageBitmap {
        const sprite = this.sprites.get(key);
        if (sprite) return sprite;

        const bitmap = buildSprite(bounds, draw, target);
        this.sprites.set(key, bitmap);
        return bitmap;
    }

    public clear() {
        this.sprites.clear();
    }
}

export type SpriteCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
