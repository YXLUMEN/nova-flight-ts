import {NbtBinaryWriter} from "../../nbt/NbtBinaryWriter.ts";
import {NbtBinaryReader} from "../../nbt/NbtBinaryReader.ts";

export class PacketCodec<T> {
    private readonly encoder: (value: T, writer: NbtBinaryWriter) => void;
    private readonly decoder: (reader: NbtBinaryReader) => T;

    private constructor(
        encoder: (value: T, writer: NbtBinaryWriter) => void,
        decoder: (reader: NbtBinaryReader) => T
    ) {
        this.encoder = encoder;
        this.decoder = decoder;
    }

    public static of<T>(
        encoder: (value: T, writer: NbtBinaryWriter) => void,
        decoder: (reader: NbtBinaryReader) => T
    ): PacketCodec<T> {
        return new PacketCodec(encoder, decoder);
    }

    public encode(value: T, writer: NbtBinaryWriter): Uint8Array {
        this.encoder(value, writer);
        return writer.toUint8Array();
    }

    public decode(reader: NbtBinaryReader): T {
        return this.decoder(reader);
    }
}
