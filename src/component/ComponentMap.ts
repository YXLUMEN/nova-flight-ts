import type {DataComponentType} from "./DataComponentType.ts";

export interface ComponentMap {
    getComponents(): Map<DataComponentType<any>, any>;

    get<T>(type: DataComponentType<T>): T | null;

    has<T>(type: DataComponentType<T>): boolean;

    size(): number;
}