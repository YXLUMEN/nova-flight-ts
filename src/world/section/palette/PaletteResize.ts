import {config} from "../../../utils/uit.ts";
import {IllegalArgumentError} from "../../../type/errors.ts";


export interface PaletteResize<T> {
    onResize(size: number, lastAddValue: T): number;
}

export const RESIZE_FAIL: PaletteResize<any> = config({
    onResize: (size, lastAddValue) => {
        throw new IllegalArgumentError(`Unexpected palette resize, size = ${size}, added value = ${lastAddValue}`);
    }
});