import type {NbtCompound} from "./NbtCompound";

export type NbtValue = number | string | boolean | number[] | string[] | NbtCompound | NbtCompound[];

export const NbtTypes = {
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
} as const;

export type NbtType = typeof NbtTypes[keyof typeof NbtTypes];

export interface Nbt {
    type: NbtType,
    value: NbtValue
}