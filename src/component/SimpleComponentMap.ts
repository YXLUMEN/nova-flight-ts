import type {ComponentType} from "./ComponentType.ts";
import {Compare} from "../utils/collection/Compare.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";
import type {ComponentMap} from "./ComponentMap.ts";

export class SimpleComponentMap implements ComponentMap {
    public static readonly EMPTY = new SimpleComponentMap(null);

    public readonly components: Map<ComponentType<any>, any>;

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
        return new SimpleComponentMap(this);
    }

    public equals(o: Object): boolean {
        return this === o ? true :
            o instanceof SimpleComponentMap &&
            Compare.mapsEqual(this.components, o.components);
    }

    public toNbt(): NbtCompound {
        const nbt = new NbtCompound();
        for (const [type, value] of this.components) {
            const id = Registries.DATA_COMPONENT_TYPE.getId(type);
            if (!id) continue;
            nbt.putCompound(id.toString(), type.codec.encode(value));
        }
        return nbt;
    }

    public static fromNbt(nbt: NbtCompound): SimpleComponentMap {
        const map = new SimpleComponentMap();
        for (const key of nbt.getKeys()) {
            const id = Identifier.tryParse(key);
            if (!id) continue;
            const entry = Registries.DATA_COMPONENT_TYPE.getEntryById(id);
            if (!entry) continue;
            const nbtEntry = nbt.getCompound(key);
            if (!nbtEntry) continue;

            const type = entry.getValue();
            const compound = type.codec.decode(nbtEntry);
            map.set(type, compound);
        }
        return map;
    }
}