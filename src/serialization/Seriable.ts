import {BinaryWriter} from "./BinaryWriter.ts";
import {BinaryReader} from "./BinaryReader.ts";

export interface Serializable {
    write(writer: BinaryWriter): void;

    read(reader: BinaryReader): void;
}