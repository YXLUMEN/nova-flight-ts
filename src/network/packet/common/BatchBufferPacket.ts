import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {CodecRegistry} from "../../CodecRegistry.ts";
import {WSNetworkChannel} from "../../WSNetworkChannel.ts";
import {PacketTooLargeError} from "../../../type/errors.ts";
import {compress, decompress} from "@bokuweb/zstd-wasm";
import type {ClientCommonHandler} from "../../../client/network/handler/ClientCommonHandler.ts";
import type {BatchBuffer} from "./BatchBuffer.ts";

export class BatchBufferPacket implements Payload, BatchBuffer {
    public static readonly ID: PayloadType<BatchBufferPacket> = payloadType('batch_buffer');
    public static readonly CODEC: PacketCodec<BatchBufferPacket> = PacketCodecs.of(this.write, this.read);

    private readonly payloadCount: number;
    private readonly compressed: boolean;
    public readonly buffer: Uint8Array<ArrayBuffer>;

    private constructor(payloadCount: number, compressed: boolean, buffer: Uint8Array<ArrayBuffer>) {
        this.payloadCount = payloadCount;
        this.compressed = compressed;
        this.buffer = buffer;
    }

    public static create(payloads: Iterable<Payload>, registry: CodecRegistry): Payload[] {
        const maxSize = WSNetworkChannel.MAX_PACKET_SIZE - 16;
        const batches: Payload[] = [];
        const writer = new BinaryWriter(9216); // MAX_PACKET_SIZE * 1.5

        let count = 0;
        for (const payload of payloads) {
            const codec = registry.get(payload.type());
            if (!codec) throw new Error(`Missing packet type ${payload.type().id}`);

            const start = writer.getOffset();
            const est = payload.estimateSize?.() ?? 0;
            if (start + est <= maxSize) {
                writer.writeVarUint(codec.index);
                codec.codec.encode(writer, payload);

                if (writer.getOffset() <= maxSize) {
                    count++;
                    continue;
                }
            }
            writer.truncate(start);

            if (count > 0) {
                batches.push(this.pack(count, writer));
                count = 0;
                writer.reset();
            }

            writer.writeVarUint(codec.index);
            codec.codec.encode(writer, payload);
            count = 1;

            if (writer.getOffset() > maxSize) {
                throw new PacketTooLargeError(`Packet ${payload.type().id} exceeds ${maxSize} bytes: ${writer.getOffset()}`);
            }
        }

        if (count > 0) {
            batches.push(this.pack(count, writer));
        }

        return batches;
    }

    private static pack(count: number, writer: BinaryWriter): Payload {
        const raw = writer.toUint8Array();
        if (raw.length < 512) {
            return new BatchBufferPacket(count, false, raw.slice());
        }

        const compressed = compress(raw, 1) as Uint8Array<ArrayBuffer>;
        return compressed.length >= raw.length ?
            new BatchBufferPacket(count, false, raw.slice()) :
            new BatchBufferPacket(count, true, compressed);
    }

    public parse(): Payload[] {
        const buf = this.compressed ? decompress(this.buffer) : this.buffer;
        const reader = new BinaryReader(buf as Uint8Array<ArrayBuffer>);
        const payloads: Payload[] = new Array(this.payloadCount);

        for (let i = 0; i < payloads.length; i++) {
            const index = reader.readVarUint();
            const type = CodecRegistry.byId(index);
            if (!type) throw new Error(`Unrecognized packet: ${index}`);
            payloads[i] = type.codec.decode(reader);
        }

        return payloads;
    }

    private static read(reader: BinaryReader): BatchBufferPacket {
        const count = reader.readVarUint();
        const compressed = reader.readBoolean();
        const len = reader.readVarUint();
        const buffer = reader.readSlice(len);

        return new BatchBufferPacket(count, compressed, buffer);
    }

    private static write(writer: BinaryWriter, value: BatchBufferPacket): void {
        writer.writeVarUint(value.payloadCount);
        writer.writeBoolean(value.compressed);
        writer.writeVarUint(value.buffer.length);
        writer.pushBytes(value.buffer);
    }

    public type(): PayloadType<BatchBufferPacket> {
        return BatchBufferPacket.ID;
    }

    public accept(listener: ClientCommonHandler): void {
        listener.onBatch(this);
    }

    public estimateSize(): number {
        return 9 + this.buffer.length;
    }
}