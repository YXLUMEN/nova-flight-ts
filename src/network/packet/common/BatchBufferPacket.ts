import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ClientCommonHandler} from "../../../client/network/handler/ClientCommonHandler.ts";
import type {BatchBuffer} from "./BatchBuffer.ts";
import type {PacketListener} from "../../handler/PacketListener.ts";
import {compress, decompress} from "@bokuweb/zstd-wasm";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {CodecRegistry} from "../../CodecRegistry.ts";
import {WSNetworkChannel} from "../../WSNetworkChannel.ts";
import {PacketTooLargeError} from "../../../type/errors.ts";

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

    public static create(payloads: Iterable<Payload>, registry: CodecRegistry): BatchBufferPacket[] {
        const maxSize = WSNetworkChannel.MAX_PACKET_SIZE - 16;
        const batches: BatchBufferPacket[] = [];
        const writer = new BinaryWriter(9216); // MAX_PACKET_SIZE * 1.5

        let count = 0;
        for (const payload of payloads) {
            // noinspection DuplicatedCode
            const codec = registry.get(payload.type());
            if (!codec) throw new Error(`Missing packet type ${payload.type().id}`);

            let last: Uint8Array<ArrayBuffer> | undefined;
            const start = writer.getOffset();
            const est = payload.estimateSize?.() ?? 0;
            if (start + est <= maxSize) {
                // 留了余量,先不考虑估算 varUint 的长度
                writer.writeVarUint(codec.index);
                codec.codec.encode(writer, payload);

                if (writer.getOffset() <= maxSize) {
                    count++;
                    continue;
                }
                last = writer.toUint8Array().subarray(start);
            }

            writer.truncate(start);

            if (count > 0) {
                // 复用 writer 必须拷贝
                batches.push(this.pack(count, writer.clone()));
                count = 0;
                writer.reset();
            }

            if (last) {
                writer.pushBytes(last);
            } else {
                writer.writeVarUint(codec.index);
                codec.codec.encode(writer, payload);
            }
            count = 1;

            if (writer.getOffset() > maxSize) {
                throw new PacketTooLargeError(writer.getOffset(), maxSize, {cause: payload.type()});
            }
        }

        if (count > 0) {
            // 队列为空说明完全包含, buffer 无偏移问题
            const buffer = batches.length === 0 ? writer.toUint8Array() : writer.clone();
            batches.push(this.pack(count, buffer));
        }

        return batches;
    }

    private static pack(count: number, buffer: Uint8Array<ArrayBuffer>): BatchBufferPacket {
        if (buffer.length < 512) {
            return new BatchBufferPacket(count, false, buffer);
        }

        const compressed = compress(buffer, 1) as Uint8Array<ArrayBuffer>;
        return compressed.length >= buffer.length ?
            new BatchBufferPacket(count, false, buffer) :
            new BatchBufferPacket(count, true, compressed);
    }

    public parse(handler: PacketListener): void {
        const buf = this.compressed ? decompress(this.buffer) : this.buffer;
        const reader = new BinaryReader(buf as Uint8Array<ArrayBuffer>);
        // noinspection DuplicatedCode
        for (let i = 0; i < this.payloadCount; i++) {
            const index = reader.readVarUint();
            const type = CodecRegistry.byId(index);
            if (!type) throw new Error(`Unrecognized packet: ${index}`);
            const payload = type.codec.decode(reader);

            try {
                payload.accept(handler);
            } catch (err) {
                console.error('Decode batch', err);
            }
        }
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