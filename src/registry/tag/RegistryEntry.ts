import type {TagKey} from "./TagKey.ts";
import type {RegistryKey} from "../RegistryKey.ts";

export class RegistryEntry<T> {
    private tags = new Set<TagKey<T>>();
    private registryKey: RegistryKey<T> | null;
    private readonly value: T | null;

    public constructor(registryKey: RegistryKey<T> | null, value: T | null = null) {
        this.registryKey = registryKey;
        this.value = value;
    }

    public getRegistryKey(): RegistryKey<T> {
        if (this.registryKey === null) {
            throw new Error("Registry key was not found");
        } else {
            return this.registryKey;
        }
    }

    public getValue(): T {
        if (this.value === null) {
            throw new Error("Value was not found");
        } else {
            return this.value;
        }
    }

    public isIn(tag: TagKey<T>): boolean {
        return this.tags.has(tag);
    }

    public setRegistryKey(registryKey: RegistryKey<T>): void {
        if (this.registryKey !== null && this.registryKey !== registryKey) {
            throw new Error(`Can't change holder key: existing=${this.registryKey} new=${registryKey}`);
        } else {
            this.registryKey = registryKey;
        }
    }

    public matchesKey(key: RegistryKey<T>): boolean {
        return this.getRegistryKey() === key;
    }

    public setTags(tags: Set<TagKey<T>>): void {
        this.tags = tags;
    }
}