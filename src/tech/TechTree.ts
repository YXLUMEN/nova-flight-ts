import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import type {Tech} from "./Tech.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";

export interface TechTree extends NbtSerializable {
    unlock(tech: RegistryEntry<Tech>): boolean;

    forceUnlock(tech: RegistryEntry<Tech>): void;

    unlockAll(): void;

    isUnlocked(tech: RegistryEntry<Tech>): boolean;

    resetTech(): void;

    unloadedTechCount(): number;
}