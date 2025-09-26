import type {NbtCompound} from "./NbtCompound";

export type NbtValue = number | string | boolean | number[] | string[] | NbtCompound | NbtCompound[];

export const NbtType = {
    End: 0,
    Int8: 1,
    Int16: 2,
    Int32: 3,
    Float: 4,
    Double: 5,
    Uint: 6,
    String: 7,
    Boolean: 8,
    NumberArray: 9,
    StringArray: 10,
    Compound: 11,
    NbtList: 12
}

export interface Nbt {
    type: number,
    value: NbtValue
}