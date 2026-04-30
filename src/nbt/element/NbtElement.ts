import type {NbtTypeIndex} from "../NbtType.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export interface NbtElement {
    getType(): NbtTypeIndex;

    write(writer: BinaryWriter): void;

    copy(): NbtElement;
}