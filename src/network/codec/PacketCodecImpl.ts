import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {PacketCodec} from "./PacketCodec.ts";
import type {BiConsumer, Return} from "../../type/types.ts";

export class PacketCodecImpl<T> implements PacketCodec<T> {
    private readonly encoder: BiConsumer<BinaryWriter, T>;
    private readonly decoder: Return<BinaryReader, T>;

    public constructor(encoder: BiConsumer<BinaryWriter, T>, decoder: Return<BinaryReader, T>) {
        this.encoder = encoder;
        this.decoder = decoder;
    }

    public encode(writer: BinaryWriter, value: T): void {
        this.encoder(writer, value);
    }

    public decode(reader: BinaryReader): T {
        return this.decoder(reader);
    }
}