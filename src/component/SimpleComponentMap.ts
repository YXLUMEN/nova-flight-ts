import {type DataComponentType} from "./DataComponentType.ts";
import {Compare} from "../utils/collection/Compare.ts";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";
import type {ComponentMap} from "./ComponentMap.ts";

export class SimpleComponentMap implements ComponentMap {
    public static readonly EMPTY = new SimpleComponentMap(null);

    public readonly baseComponents: Map<DataComponentType<any>, any>;

    public constructor(components: ComponentMap | null = null) {
        if (components) {
            this.baseComponents = new Map(components.getComponents());
            return;
        }
        this.baseComponents = new Map<DataComponentType<any>, any>();
    }

    public get<T>(type: DataComponentType<T>): T | null {
        return this.baseComponents.get(type) ?? null;
    }

    public set<T>(type: DataComponentType<T>, value: T | null): void {
        this.baseComponents.set(type, value);
    }

    public has<T>(type: DataComponentType<T>): boolean {
        return this.baseComponents.has(type);
    }

    public getOrDefault<T>(type: DataComponentType<T>, fallback: T): T {
        const component = this.baseComponents.get(type);
        return component !== undefined ? component : fallback;
    }

    public contains(type: DataComponentType<any>): boolean {
        return this.get(type) != null;
    }

    public size(): number {
        return this.baseComponents.size;
    }

    public copy() {
        return new SimpleComponentMap(this);
    }

    public equals(o: Object): boolean {
        return this === o ? true :
            o instanceof SimpleComponentMap &&
            Compare.mapsEqual(this.baseComponents, o.baseComponents);
    }

    public getComponents(): Map<DataComponentType<any>, any> {
        return this.baseComponents;
    }

    public toNbt(): NbtCompound {
        const nbt = new NbtCompound();
        for (const [type, value] of this.baseComponents) {
            const id = Registries.DATA_COMPONENT_TYPE.getId(type);
            if (!id) continue;
            nbt.set(id.toString(), type.codec.encode(value))
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

            const nbtEntry = nbt.get(key);
            if (!nbtEntry) continue;

            const type = entry.getValue();
            const compound = type.codec.decode(nbtEntry);
            map.set(type, compound);
        }
        return map;
    }
}