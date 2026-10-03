import type {AABB} from "../../../utils/math/AABB.ts";
import {buildSprite, type RenderCache, type SpriteRender} from "./RenderCache.ts";
import {isDev} from "../../../configs/RuntimeConfig.ts";

export class MapRenderCache<K> implements RenderCache<K> {
    private readonly sprites: Map<K, ImageBitmap>;
    private readonly capacity: number;

    public constructor(capacity: number = 128) {
        this.capacity = capacity;
        this.sprites = new Map();
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

        if (this.sprites.size >= this.capacity) {
            if (isDev) console.log('Cache expiration with key: ', key);
            const entry = this.sprites.entries().next().value;
            if (entry) {
                this.sprites.delete(entry[0]);
                entry[1].close();
            }
        }

        this.sprites.set(key, bitmap);
        return bitmap;
    }

    public clear() {
        for (const bitmap of this.sprites.values()) {
            bitmap.close();
        }
        this.sprites.clear();
    }
}
