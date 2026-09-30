import type {AABB} from "../math/AABB.ts";
import type {ViewRect} from "../../client/render/Camera.ts";
import type {SpriteCtx} from "../../client/render/cache/LRURenderCache.ts";
import {decodeColorToHex} from "../net_util.ts";

export function isBoxInView(box: AABB, viewRect: ViewRect): boolean {
    return (
        box.minX < viewRect.right &&
        box.maxX > viewRect.left &&
        box.minY < viewRect.bottom &&
        box.maxY > viewRect.top
    );
}

// 中心到边缘的径向渐变
export function gradientOf(ctx: SpriteCtx, radius: number, color0: number, color1: number): CanvasGradient {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, decodeColorToHex(color0));
    gradient.addColorStop(1, decodeColorToHex(color1));
    return gradient;
}