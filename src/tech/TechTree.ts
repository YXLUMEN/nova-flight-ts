import type {NbtSerializable} from "../nbt/NbtSerializable.ts";

export interface TechTree extends NbtSerializable {
    unlockAll(): void;

    isUnlocked(id: string): boolean;
}