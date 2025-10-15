import type {NbtSerializable} from "../nbt/NbtSerializable.ts";

export interface TechTree extends NbtSerializable {
    unlock(id: string): boolean;

    unlockAll(): void;

    isUnlocked(id: string): boolean;
}