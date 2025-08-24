import {RegistryKey} from "./RegistryKey.ts";
import {RegistryEntry} from "./tag/RegistryEntry.ts";
import type {Identifier} from "./Identifier.ts";
import type {TagKey} from "./tag/TagKey.ts";

export class Registry<T> {
    public readonly key: RegistryKey<T>;

    private readonly idToEntry: Map<Identifier, RegistryEntry<T>>;
    private readonly keyToEntry: Map<RegistryKey<T>, RegistryEntry<T>>;
    private readonly valueToEntry: Map<T, RegistryEntry<T>>;

    public constructor(key: RegistryKey<Registry<T>>) {
        this.key = key;
        this.idToEntry = new Map<Identifier, RegistryEntry<T>>();
        this.keyToEntry = new Map<RegistryKey<T>, RegistryEntry<T>>();
        this.valueToEntry = new Map<T, RegistryEntry<T>>();
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
        if (this.idToEntry.has(key.getValue())) throw new Error("ID is already registered");
        if (this.valueToEntry.has(value)) throw new Error("Value is already registered");

        const entry = new RegistryEntry(key, value);
        if (tags) entry.setTags(new Set(tags));

        this.keyToEntry.set(key, entry);
        this.idToEntry.set(key.getValue(), entry);
        this.valueToEntry.set(value, entry);
        return entry;
    }

    public static registerReference<T>(registry: Registry<T>, key: RegistryKey<T>, entry: T): RegistryEntry<T> {
        return registry.add(key, entry);
    }

    public static registerReferenceById<T>(registry: Registry<T>, id: Identifier, entry: T): RegistryEntry<T> {
        return this.registerReference(registry, RegistryKey.of(registry.getKey(), id), entry);
    }
}