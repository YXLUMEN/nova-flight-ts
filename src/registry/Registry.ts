import {RegistryKey} from "./RegistryKey.ts";
import {RegistryEntry} from "./tag/RegistryEntry.ts";
import type {Identifier} from "./Identifier.ts";
import type {TagKey} from "./tag/TagKey.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import type {IndexedIterable} from "../utils/collection/IndexedIterable.ts";

export class Registry<T> {
    public static registerReference<T>(registry: Registry<T>, key: RegistryKey<T>, entry: T): RegistryEntry<T> {
        return registry.add(key, entry);
    }

    public static registerReferenceById<T>(registry: Registry<T>, id: Identifier, entry: T): RegistryEntry<T> {
        return this.registerReference(registry, RegistryKey.of(registry.getKey(), id), entry);
    }

    private static getValue<T>(entry: RegistryEntry<T> | null): T | null {
        return entry !== null ? entry.getValue() : null;
    }

    public readonly key: RegistryKey<T>;

    private readonly indexToEntry: RegistryEntry<T>[];
    private readonly valueToIndex: Map<T, number>;
    private readonly idToEntry: HashMap<Identifier, RegistryEntry<T>>;
    private readonly keyToEntry: Map<RegistryKey<T>, RegistryEntry<T>>;
    private readonly valueToEntry: Map<T, RegistryEntry<T>>;

    public constructor(key: RegistryKey<Registry<T>>) {
        this.key = key;
        this.indexToEntry = [];
        this.valueToIndex = new Map<T, number>();
        this.idToEntry = new HashMap<Identifier, RegistryEntry<T>>();
        this.keyToEntry = new Map<RegistryKey<T>, RegistryEntry<T>>();
        this.valueToEntry = new Map<T, RegistryEntry<T>>();
    }

    public getKey(): RegistryKey<T> {
        return this.key;
    }

    public add(key: RegistryKey<T>, value: T, ...tags: TagKey<T>[]): RegistryEntry<T> {
        if (this.idToEntry.has(key.getValue())) throw new Error(`ID is already registered: ${key.getValue()}`);
        if (this.valueToEntry.has(value)) throw new Error(`Value is already registered: ${value}`);

        const entry = new RegistryEntry(key, value);
        if (tags && tags.length > 0) entry.setTags(new Set(tags));

        this.keyToEntry.set(key, entry);
        this.idToEntry.set(key.getValue(), entry);
        this.valueToEntry.set(value, entry);

        const index = this.indexToEntry.length;
        this.indexToEntry.push(entry);
        this.valueToIndex.set(value, index);

        return entry;
    }

    public getId(value: T): Identifier | null {
        const entry = this.valueToEntry.get(value);
        return entry !== undefined ? entry.getRegistryKey().getValue() : null
    }

    public getRegistryKey(value: T): RegistryKey<T> | null {
        return this.valueToEntry.get(value)?.getRegistryKey() ?? null;
    }

    public getIndex(value: T): number {
        return this.valueToIndex.get(value) ?? -1;
    }

    public getById(id: Identifier | null): T | null {
        if (!id) return null;
        return Registry.getValue(this.idToEntry.get(id) ?? null);
    }

    public getByRawId(index: number): T | null {
        return index >= 0 && index < this.indexToEntry.length ? this.indexToEntry[index].getValue() : null;
    }

    public getEntryById(id: Identifier): RegistryEntry<T> | null {
        return this.idToEntry.get(id) ?? null;
    }

    public getEntryByValue(value: T): RegistryEntry<T> | null {
        return this.valueToEntry.get(value) ?? null;
    }

    public getEntryByKey(key: RegistryKey<T>): RegistryEntry<T> {
        return this.keyToEntry.get(key)!;
    }

    public getEntryByIndex(index: number): RegistryEntry<T> | null {
        return index >= 0 && index < this.indexToEntry.length ? this.indexToEntry[index] : null;
    }

    public size() {
        return this.keyToEntry.size;
    }

    public getIds(): Set<Identifier> {
        return new Set(this.idToEntry.keys());
    }

    public getIdValues() {
        return this.idToEntry.keys();
    }

    public getIndexedEntries(): IndexedIterable<T> {
        const self = this;
        return {
            getRawId(v: T) {
                return self.getIndex(v);
            },
            get(i: number) {
                return self.getByRawId(i);
            },
            getOrThrow(index: number): T {
                const value = this.get(index);
                if (value === null) throw new ReferenceError(`No value with id ${index}`);
                return value
            },
            getRawOrThrow(value: T): number {
                const id = this.getRawId(value);
                if (id === -1) {
                    throw new ReferenceError(`Can't find id for ${value}`);
                }
                return id;
            },
            size() {
                return self.size();
            },

            [Symbol.iterator]() {
                return self.valueToIndex.keys();
            },
        };
    }
}