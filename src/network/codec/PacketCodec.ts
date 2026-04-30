import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";

export interface PacketCodec<T> {
    encode(writer: BinaryWriter, value: T): void;

    decode(reader: BinaryReader): T;
}