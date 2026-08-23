import {MemoryLRU} from "../../../utils/collection/MemoryLRU.ts";
import type {BiConsumer} from "../../../type/types.ts";
import {DPR} from "../../../utils/uit.ts";

export class RenderCache {
    private readonly sprites: MemoryLRU<number, ImageBitmap>;

    public constructor(capacity: number = 128) {
        this.sprites = new MemoryLRU(
            capacity,
            (val) => val.value?.close()
        );
    }

    public get<E>(
        key: number,
        width: number,
        height: number,
        draw: BiConsumer<SpriteCtx, E>,
        target: E
    ): ImageBitmap {
        const sprite = this.sprites.get(key);
        if (sprite) return sprite;

        const canvas = new OffscreenCanvas(Math.ceil(width * DPR), Math.ceil(height * DPR));
        const ctx = canvas.getContext('2d')!;
        ctx.scale(DPR, DPR);
        ctx.translate(width / 2, height / 2);
        draw(ctx, target);

        const bitmap = canvas.transferToImageBitmap();
        this.sprites.set(key, bitmap);
        return bitmap;
    }

    public clear() {
        this.sprites.clear();
    }
}

export type SpriteCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;