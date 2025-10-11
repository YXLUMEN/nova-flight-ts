import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";

export interface PacketCodec<T> {
    encode(value: T, writer: BinaryWriter): Uint8Array;

    decode(reader: BinaryReader): T;
}