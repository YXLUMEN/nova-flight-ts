import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";
import type {PacketCodec} from "./PacketCodec.ts";

export class PacketCodecUtil<T> implements PacketCodec<T> {
    private readonly encoder: (value: T, writer: BinaryWriter) => void;
    private readonly decoder: (reader: BinaryReader) => T;

    private constructor(
        encoder: (value: T, writer: BinaryWriter) => void,
        decoder: (reader: BinaryReader) => T
    ) {
        this.encoder = encoder;
        this.decoder = decoder;
    }

    public static of<T>(
        encoder: (value: T, writer: BinaryWriter) => void,
        decoder: (reader: BinaryReader) => T
    ): PacketCodec<T> {
        return new PacketCodecUtil(encoder, decoder);
    }

    public static empty<T>(decoder: new () => T): PacketCodec<T> {
        return new PacketCodecUtil(() => {
        }, () => new decoder());
    }

    public encode(writer: BinaryWriter, value: T): Uint8Array {
        this.encoder(value, writer);
        return writer.toUint8Array();
    }

    public decode(reader: BinaryReader): T {
        return this.decoder(reader);
    }
}
