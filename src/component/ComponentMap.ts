import type {ComponentType} from "./ComponentType.ts";

export interface ComponentMap {
    components: Map<ComponentType<any>, any>;

    get<T>(type: ComponentType<T>): T | null;
}