import type {BiConsumer} from "../../../type/types.ts";
import type {AABB} from "../../../utils/math/AABB.ts";
import type {SpriteCtx} from "./LRURenderCache.ts";
import {buildSprite, type RenderCache} from "./RenderCache.ts";
import {isDev} from "../../../configs/GlobalConfig.ts";

export class MapRenderCache<K> implements RenderCache<K> {
    private readonly sprites: Map<K, ImageBitmap>;
    private readonly capacity: number;

    public constructor(capacity: number = 128) {
        this.capacity = capacity;
        this.sprites = new Map();
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

        if (this.sprites.size >= this.capacity) {
            if (isDev) console.log(`Cache expiration with key "${key}" for\n ${target}`);
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
