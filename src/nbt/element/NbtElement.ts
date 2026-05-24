import type {NbtTypeId} from "../NbtType.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export interface NbtElement {
    getType(): NbtTypeId;

    write(writer: BinaryWriter): void;

    copy(): NbtElement;
}