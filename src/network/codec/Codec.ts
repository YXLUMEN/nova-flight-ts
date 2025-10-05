import {NbtCompound} from "../../nbt/NbtCompound.ts";

export interface Codec<T> {
    encode(value: T): NbtCompound;

    decode(nbt: NbtCompound): T | null;
}
