import type {NbtTypeId} from "../NbtType.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export interface NbtElement {
    type(): NbtTypeId;

    write(writer: BinaryWriter): void;

    copy(): NbtElement;

    toSNBT(): string;
}

export interface NbtNumber extends NbtElement {
    readonly value: number;
}

export interface NbtArray<T> extends NbtElement {
    readonly elements: ArrayLike<T>;
}