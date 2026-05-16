import type {Payload} from "../Payload.ts";
import {payloadType, type PayloadType} from "../PayloadType.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import {compress, decompress} from "@bokuweb/zstd-wasm";
import type {ClientCommonHandler} from "../../client/network/handler/ClientCommonHandler.ts";
import type {ServerCommonHandler} from "../../server/network/handler/ServerCommonHandler.ts";

export class CompressedPacket implements Payload {
    public static readonly ID: PayloadType<CompressedPacket> = payloadType('compressed_packet');
    public static readonly CODEC: PacketCodec<CompressedPacket> = PacketCodecs.of(this.write, this.read);

    private readonly buffer: Uint8Array<ArrayBuffer>;

    private constructor(buffer: Uint8Array<ArrayBuffer>) {
        this.buffer = buffer;
    }

    public static create(buffer: Uint8Array<ArrayBuffer>) {
        return new CompressedPacket(compress(buffer) as Uint8Array<ArrayBuffer>);
    }

    private static write(writer: BinaryWriter, value: CompressedPacket): void {
        writer.writeVarUint(value.buffer.length);
        writer.pushBytes(value.buffer);

    }

    private static read(reader: BinaryReader): CompressedPacket {
        const len = reader.readVarUint();
        const buf = reader.readSlice(len);
        return new CompressedPacket(buf);
    }

    public parse() {
        return decompress(this.buffer) as Uint8Array<ArrayBuffer>;
    }

    public type(): PayloadType<any> {
        return CompressedPacket.ID;
    }

    public accept(listener: ClientCommonHandler | ServerCommonHandler): void {
        listener.accept(this);
    }
}