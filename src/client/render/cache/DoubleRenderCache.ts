import {buildSprite, type RenderCache} from "./RenderCache.ts";
import type {BiConsumer} from "../../../type/types.ts";
import type {AABB} from "../../../utils/math/AABB.ts";
import type {SpriteCtx} from "./LRURenderCache.ts";

export class DoubleRenderCache implements RenderCache<boolean> {
    private sprite0: ImageBitmap | null = null;
    private sprite1: ImageBitmap | null = null;

    public get<E>(
        key: boolean,
        bounds: AABB,
        draw: BiConsumer<SpriteCtx, E>,
        target: E
    ): ImageBitmap {
        if (key) {
            if (!this.sprite0) this.sprite0 = buildSprite(bounds, draw, target);
            return this.sprite0;
        }

        if (!this.sprite1) this.sprite1 = buildSprite(bounds, draw, target);
        return this.sprite1;
    }

    public clear() {
        this.sprite0?.close();
        this.sprite1?.close();
        this.sprite0 = null;
        this.sprite1 = null;
    }
}
