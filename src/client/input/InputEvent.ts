import type {BiConsumer, Consumer} from "../../type/types.ts";
import {config} from "../../utils/uit.ts";

export interface InputEvents {
    onKeyPress: BiConsumer<string, KeyboardEvent>;
    onMouseDown: BiConsumer<number, MouseEvent>;
    onMouseUp: BiConsumer<number, MouseEvent>;
    onMouseMove: Consumer<MouseEvent>;
    onWheel: Consumer<WheelEvent>;
}

export const EMPTY_INPUT: InputEvents = config({
    onKeyPress: () => {
    },
    onMouseMove: () => {
    },
    onMouseDown: () => {
    },
    onMouseUp: () => {
    },
    onWheel: () => {
    }
});