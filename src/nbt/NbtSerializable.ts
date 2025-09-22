import {NbtCompound} from "./NbtCompound";

export interface NbtSerializable {
    writeNBT(nbt: NbtCompound): NbtCompound;

    readNBT(nbt: NbtCompound): void;
}