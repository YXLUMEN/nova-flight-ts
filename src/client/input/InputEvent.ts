import type {BiConsumer, Consumer} from "../../type/types.ts";

export interface InputEvents {
    onKeyPress?: BiConsumer<string, KeyboardEvent>;
    onMouseDown?: BiConsumer<number, MouseEvent>;
    onMouseUp?: BiConsumer<number, MouseEvent>;
    onMouseMove?: Consumer<MouseEvent>;
    onWheel?: Consumer<WheelEvent>;
}