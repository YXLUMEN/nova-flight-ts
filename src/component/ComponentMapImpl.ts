import {type DataComponentType} from "./DataComponentType.ts";
import {Compare} from "../utils/collection/Compare.ts";
import {ComponentChanges} from "./ComponentChanges.ts";
import {Optional} from "../utils/Optional.ts";
import type {ComponentMap} from "./ComponentMap.ts";

export class ComponentMapImpl implements ComponentMap {
    public static readonly EMPTY = Object.freeze(new ComponentMapImpl()) as ComponentMapImpl;

    private readonly baseComponents: Map<DataComponentType<any>, any>;
    private changedComponents: Map<DataComponentType<any>, Optional<any>>;
    private copyOnWrite: boolean;

    public constructor(components?: ComponentMap, changedComponents?: Map<DataComponentType<any>, Optional<any>>, copyOnWrite = true) {
        if (!components) {
            this.baseComponents = new Map();
        } else {
            this.baseComponents = components.getComponents();
        }

        if (!changedComponents) {
            this.changedComponents = new Map();
        } else {
            this.changedComponents = changedComponents;
        }
        this.copyOnWrite = copyOnWrite;
    }

    public static create(base: ComponentMap, changes: ComponentChanges) {
        if (this.shouldReuseChangesMap(base, changes.changedComponents)) {
            return new ComponentMapImpl(base, changes.changedComponents);
        }

        const cMap = new ComponentMapImpl(base);
        cMap.applyChanges(changes);
        return cMap;
    }

    private static shouldReuseChangesMap(base: ComponentMap, changes: Map<DataComponentType<any>, Optional<any>>): boolean {
        for (const [type, optional] of changes) {
            const object = base.get(type);
            if (optional.isPresent() && optional.get() === object) {
                return false;
            }
            if (optional.isEmpty() && object === null) {
                return false;
            }
        }

        return true;
    }

    public get<T>(type: DataComponentType<T>): T | null {
        const changed = this.changedComponents.get(type) ?? null;
        return changed !== null ? changed.orElse(null) : this.baseComponents.get(type) ?? null;
    }

    public set<T>(type: DataComponentType<T>, value: T | null): void {
        this.onWrite();

        const object = this.baseComponents.get(type);
        if (value === object) {
            this.changedComponents.delete(type);
        } else {
            this.changedComponents.set(type, Optional.ofNullable(value));
        }
    }

    public remove<T>(type: DataComponentType<T>): void {
        this.onWrite();

        const object = this.baseComponents.get(type);
        if (object !== null) {
            this.changedComponents.set(type, Optional.empty());
        } else {
            this.changedComponents.delete(type);
        }
    }

    public applyChanges(changes: ComponentChanges): void {
        this.onWrite();

        for (const entry of changes.changedComponents) {
            this.applyChange(entry[0], entry[1]);
        }
    }

    public applyChange(type: DataComponentType<any>, optional: Optional<any>) {
        const value = this.baseComponents.get(type) ?? null;
        if (optional.isPresent()) {
            if (optional.get() === value) {
                this.changedComponents.delete(type);
            } else {
                this.changedComponents.set(type, optional);
            }
        } else if (value !== null) {
            this.changedComponents.set(type, Optional.empty());
        } else {
            this.changedComponents.delete(type);
        }
    }

    public setChanges(changes: ComponentChanges): void {
        this.onWrite();
        this.changedComponents.clear();
        changes.changedComponents.entries().forEach(component => {
            this.changedComponents.set(component[0], component[1]);
        });
    }

    public has<T>(type: DataComponentType<T>): boolean {
        return this.baseComponents.has(type);
    }

    public getOrDefault<T>(type: DataComponentType<T>, fallback: T): T {
        const component = this.get(type);
        return component !== null ? component : fallback;
    }

    public contains(type: DataComponentType<any>): boolean {
        return this.get(type) != null;
    }

    public size(): number {
        return this.baseComponents.size;
    }

    public getComponents(): Map<DataComponentType<any>, any> {
        return this.baseComponents;
    }

    public getChanges(): ComponentChanges {
        if (this.changedComponents.size === 0) {
            return ComponentChanges.EMPTY;
        }
        this.copyOnWrite = true;
        return new ComponentChanges(this.changedComponents);
    }

    private onWrite(): void {
        if (this.copyOnWrite) {
            this.changedComponents = new Map(this.changedComponents);
            this.copyOnWrite = false;
        }
    }

    public copy() {
        this.copyOnWrite = true;
        return new ComponentMapImpl(this, this.changedComponents, true);
    }

    public equals(o: Object): boolean {
        return this === o ? true :
            o instanceof ComponentMapImpl &&
            Compare.mapsEqual(this.baseComponents, o.baseComponents);
    }
}