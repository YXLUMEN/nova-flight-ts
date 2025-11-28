import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";

export interface PacketCodec<T> {
    encode(writer: BinaryWriter, value: T): void;

    decode(reader: BinaryReader): T;
}