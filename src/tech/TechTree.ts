import type {NbtSerializable} from "../nbt/NbtSerializable.ts";

export interface TechTree extends NbtSerializable {
    unlock(id: string): boolean;

    forceUnlock(id: string): void;

    unlockAll(): void;

    isUnlocked(id: string): boolean;

    resetTech(): void;

    unloadedTechCount(): number;
}