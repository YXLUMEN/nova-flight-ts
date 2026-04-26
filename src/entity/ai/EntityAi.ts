import type {NbtSerializable} from "../../nbt/NbtSerializable.ts";

export interface EntityAi extends NbtSerializable {
    tick(): void;

    decision(): void;

    setSeed(seed: number): void;

    isDisabled(): boolean;

    setDisabled(disabled: boolean): void;

    isSimple(): boolean;
}