import {config} from "../../utils/uit.ts";

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