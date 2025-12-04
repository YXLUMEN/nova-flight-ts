import type {ComponentType} from "./ComponentType.ts";

export interface ComponentMap {
    getComponents(): Map<ComponentType<any>, any>;

    get<T>(type: ComponentType<T>): T | null;

    has<T>(type: ComponentType<T>): boolean;

    size(): number;
}