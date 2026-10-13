import {config} from "../../utils/util.ts";

export interface EntityChangeListener {
    updateEntityPosition(): void;

    remove(): void;
}

export const EMPTY_LISTENER: EntityChangeListener = config({
    updateEntityPosition(): void {
    },
    remove(): void {
    }
});