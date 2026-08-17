import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {CodecRegistry} from "../../CodecRegistry.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {ClientCommonHandler} from "../../../client/network/handler/ClientCommonHandler.ts";
import type {BatchBuffer} from "./BatchBuffer.ts";

export class IntegratedBatchBufferPacket implements Payload, BatchBuffer {
    public static readonly ID: PayloadType<IntegratedBatchBufferPacket> = payloadType('integrated_batch_buffer');
    public static readonly CODEC: PacketCodec<IntegratedBatchBufferPacket> = PacketCodecs.of(this.write, this.read);

    public readonly payloadCount: number;
    public readonly buffer: Uint8Array<ArrayBuffer>;

    public constructor(payloadCount: number, buffer: Uint8Array<ArrayBuffer>) {
        this.payloadCount = payloadCount;
        this.buffer = buffer;
    }

    public static create(payloads: Iterable<Payload>, registry: CodecRegistry): IntegratedBatchBufferPacket {
        const writer = new BinaryWriter(9216); // MAX_PACKET_SIZE * 1.5

        let count = 0;
        for (const payload of payloads) {
            const codec = registry.get(payload.type());
            if (!codec) throw new Error(`Missing packet type ${payload.type().id}`);

            writer.writeVarUint(codec.index);
            codec.codec.encode(writer, payload);
            count++;
        }

        return new IntegratedBatchBufferPacket(count, writer.toUint8Array());
    }

    public parse(): Payload[] {
        const reader = new BinaryReader(this.buffer);
        const payloads: Payload[] = new Array(this.payloadCount).fill(null);

        for (let i = 0; i < payloads.length; i++) {
            const index = reader.readVarUint();
            const type = CodecRegistry.byId(index);
            if (!type) throw new Error(`Unrecognized packet: ${index}`);
            payloads[i] = type.codec.decode(reader);
        }

        return payloads;
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