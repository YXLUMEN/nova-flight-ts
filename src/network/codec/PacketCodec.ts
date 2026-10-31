import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";

export interface PacketCodec<T> {
    encode(writer: BinaryWriter, value: T): void;

    decode(reader: BinaryReader): T;
}