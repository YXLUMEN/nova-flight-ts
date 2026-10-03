import {buildSprite, type RenderCache, type SpriteRender} from "./RenderCache.ts";
import type {AABB} from "../../../utils/math/AABB.ts";

/**
 * 推荐用于连续序列的缓存, 一旦入列将 **不会** 再被淘汰
 * */
export class LinerRenderCache implements RenderCache<number> {
    private readonly sprites: ImageBitmap[];

    public constructor(capacity: number) {
        this.sprites = new Array(capacity).fill(null);
    }

    public get<U extends unknown[]>(
        key: number,
        bounds: AABB,
        draw: SpriteRender<U>,
        ...args: U
    ): ImageBitmap {
        if (key < 0 || key > this.sprites.length) {
            throw new RangeError('Cache out of bound');
        }

        const sprite = this.sprites[key];
        if (sprite) return sprite;

        const bitmap = buildSprite(bounds, draw, ...args);
        this.sprites[key] = bitmap;
        return bitmap;
    }

    public clear() {
        for (const bitmap of this.sprites) {
            bitmap.close();
        }
        this.sprites.length = 0;
    }
}