import type {ComponentType} from "./ComponentType.ts";
import {Compare} from "../utils/collection/Compare.ts";

export class ComponentMap {
    public static readonly EMPTY = new ComponentMap(null);

    protected readonly components: Map<ComponentType<any>, any>;

    public constructor(components: ComponentMap | null = null) {
        if (components) {
            this.components = new Map(components.components);
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

    public contains(type: ComponentType<any>): boolean {
        return this.get(type) != null;
    }

    public size(): number {
        return this.components.size;
    }

    public copy() {
        return new ComponentMap(this);
    }

    public equals(o: Object): boolean {
        return this === o ? true :
            o instanceof ComponentMap &&
            Compare.mapsEqual(this.components, o.components);
    }
}