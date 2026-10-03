import {buildSprite, type RenderCache, type SpriteRender} from "./RenderCache.ts";
import type {AABB} from "../../../utils/math/AABB.ts";

export class DoubleRenderCache implements RenderCache<boolean> {
    private sprite0: ImageBitmap | null = null;
    private sprite1: ImageBitmap | null = null;

    public get<U extends unknown[]>(
        key: boolean,
        bounds: AABB,
        draw: SpriteRender<U>,
        ...args: U
    ): ImageBitmap {
        if (key) {
            if (!this.sprite0) this.sprite0 = buildSprite(bounds, draw, ...args);
            return this.sprite0;
        }

        if (!this.sprite1) this.sprite1 = buildSprite(bounds, draw, ...args);
        return this.sprite1;
    }

    public clear() {
        this.sprite0?.close();
        this.sprite1?.close();
        this.sprite0 = null;
        this.sprite1 = null;
    }
}
