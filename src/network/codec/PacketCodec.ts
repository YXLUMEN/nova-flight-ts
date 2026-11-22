import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";

export interface PacketCodec<T> extends PacketEncoder<T>, PacketDecoder<T> {
}

export interface PacketEncoder<T> {
    encode(writer: BinaryWriter, value: T): void;
}

export interface PacketDecoder<T> {
    decode(reader: BinaryReader): T;
}