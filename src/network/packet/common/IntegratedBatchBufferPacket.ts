import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {CodecRegistry} from "../../CodecRegistry.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {ClientCommonHandler} from "../../../client/network/handler/ClientCommonHandler.ts";
import type {BatchBuffer} from "./BatchBuffer.ts";
import type {PacketListener} from "../../handler/PacketListener.ts";

export class IntegratedBatchBufferPacket implements Payload, BatchBuffer {
    public static readonly ID: PayloadType<IntegratedBatchBufferPacket> = payloadType('integrated_batch_buffer');
    public static readonly CODEC: PacketCodec<IntegratedBatchBufferPacket> = PacketCodecs.of(this.write, this.read);

    public readonly payloadCount: number;
    public readonly buffer: Uint8Array<ArrayBuffer>;

    public constructor(payloadCount: number, buffer: Uint8Array<ArrayBuffer>) {
        this.payloadCount = payloadCount;
        this.buffer = buffer;
    }

    public static create(payloads: Iterable<Payload>, registry: CodecRegistry): IntegratedBatchBufferPacket[] {
        const maxSize = 9216;
        const batches: IntegratedBatchBufferPacket[] = [];
        const writer = new BinaryWriter(maxSize); // MAX_PACKET_SIZE * 1.5

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

            // 宽松截断
            const last = writer.toUint8Array().subarray(start);
            writer.truncate(start);

            if (count > 0) {
                const buffer = writer.toUint8Array().slice();
                batches.push(new IntegratedBatchBufferPacket(count, buffer));
                count = 0;
                writer.reset();
            }

            writer.writeVarUint(codec.index);
            writer.pushBytes(last);
            count = 1;
        }

        if (count > 0) {
            const buffer = writer.toUint8Array().slice();
            batches.push(new IntegratedBatchBufferPacket(count, buffer));
        }

        return batches;
    }

    public parse(handler: PacketListener): void {
        const reader = new BinaryReader(this.buffer);

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

    private static read(reader: BinaryReader): IntegratedBatchBufferPacket {
        const count = reader.readVarUint();
        const len = reader.readVarUint();
        const buffer = reader.readSlice(len);
        return new IntegratedBatchBufferPacket(count, buffer);
    }

    private static write(writer: BinaryWriter, value: IntegratedBatchBufferPacket): void {
        writer.writeVarUint(value.payloadCount);
        writer.writeVarUint(value.buffer.length);
        writer.pushBytes(value.buffer);
    }

    public type(): PayloadType<IntegratedBatchBufferPacket> {
        return IntegratedBatchBufferPacket.ID;
    }

    public accept(listener: ClientCommonHandler): void {
        listener.onBatch(this);
    }

    public estimateSize(): number {
        return 8 + this.buffer.length;
    }
}