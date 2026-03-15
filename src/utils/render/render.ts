import type {Box} from "../math/Box.ts";
import type {ViewRect} from "../../client/render/Camera.ts";

export function isBoxInView(box: Box, viewRect: ViewRect): boolean {
    return (
        box.minX < viewRect.right &&
        box.maxX > viewRect.left &&
        box.minY < viewRect.bottom &&
        box.maxY > viewRect.top
    );
}