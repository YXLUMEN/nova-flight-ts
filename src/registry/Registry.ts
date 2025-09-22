import {RegistryKey} from "./RegistryKey.ts";
import {RegistryEntry} from "./tag/RegistryEntry.ts";
import type {Identifier} from "./Identifier.ts";
import type {TagKey} from "./tag/TagKey.ts";
import {HashMap} from "../utils/collection/HashMap.ts";

export class Registry<T> {
    public readonly key: RegistryKey<T>;

    private readonly idToEntry: HashMap<Identifier, RegistryEntry<T>>;
    private readonly keyToEntry: Map<RegistryKey<T>, RegistryEntry<T>>;
    private readonly valueToEntry: Map<T, RegistryEntry<T>>;

    public constructor(key: RegistryKey<Registry<T>>) {
        this.key = key;
        this.idToEntry = new HashMap<Identifier, RegistryEntry<T>>();
        this.keyToEntry = new Map<RegistryKey<T>, RegistryEntry<T>>();
        this.valueToEntry = new Map<T, RegistryEntry<T>>();
    }

    public static registerReference<T>(registry: Registry<T>, key: RegistryKey<T>, entry: T): RegistryEntry<T> {
        return registry.add(key, entry);
    }

    public static registerReferenceById<T>(registry: Registry<T>, id: Identifier, entry: T): RegistryEntry<T> {
        return this.registerReference(registry, RegistryKey.of(registry.getKey(), id), entry);
    }

    private static getValue<T>(entry: RegistryEntry<T> | null): T | null {
        return entry !== null ? entry.getValue() : null;
    }

    public getKey(): RegistryKey<T> {
        return this.key;
    }

    public getEntryById(id: Identifier): RegistryEntry<T> {
        return this.idToEntry.get(id)!;
    }

    public getEntryByKey(key: RegistryKey<T>) {
        return this.keyToEntry.get(key)!;
    }

    public add(key: RegistryKey<T>, value: T, tags?: TagKey<T>[]): RegistryEntry<T> {
        if (this.idToEntry.has(key.getValue())) throw new Error(`ID is already registered: ${key.getValue()}`);
        if (this.valueToEntry.has(value)) throw new Error(`Value is already registered: ${value}`);

        const entry = new RegistryEntry(key, value);
        if (tags) entry.setTags(new Set(tags));

        this.keyToEntry.set(key, entry);
        this.idToEntry.set(key.getValue(), entry);
        this.valueToEntry.set(value, entry);
        return entry;
    }

    public getId(value: T): Identifier | null {
        const entry = this.valueToEntry.get(value);
        return entry !== undefined ? entry.getRegistryKey().getValue() : null
    }

    public getEntryByValue(value: T): RegistryEntry<T> | null {
        return this.valueToEntry.get(value) ?? null;
    }

    public getById(id: Identifier | null): T | null {
        if (!id) return null;
        return Registry.getValue(this.idToEntry.get(id) ?? null);
    }

    public getIds(): Set<Identifier> {
        return new Set(this.idToEntry.keys());
    }
}