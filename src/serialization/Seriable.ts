import type {BinaryWriter} from "./BinaryWriter.ts";
import type {BinaryReader} from "./BinaryReader.ts";

export interface Serializable {
    write(writer: BinaryWriter): void;

    read(reader: BinaryReader): void;
}