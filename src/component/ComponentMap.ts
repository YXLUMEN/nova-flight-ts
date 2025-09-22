import type {ComponentType} from "./ComponentType.ts";

export class ComponentMap {
    public static readonly EMPTY = new ComponentMap(null);

    private readonly components: Map<ComponentType<any>, any>;

    public constructor(components: ComponentMap | null = null) {
        if (components) {
            this.components = components.components;
            return;
        }
        this.components = new Map<ComponentType<any>, any>();
    }

    public get<T>(type: ComponentType<T>): T | null {
        return this.components.get(type) ?? null;
    }

    public set<T>(type: ComponentType<T>, value: T | null): void {
        this.components.set(type, value);
    }

    public has<T>(type: ComponentType<T>): boolean {
        return this.components.has(type);
    }

    public getOrDefault<T>(type: ComponentType<T>, fallback: T): T {
        const component = this.components.get(type);
        return component !== undefined ? component : fallback;
    }

    public size(): number {
        return this.components.size;
    }

    public copy() {
        return new ComponentMap(this);
    }
}