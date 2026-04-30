import {type Payload, payloadId, type PayloadId} from "../Payload.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import {PayloadTypeRegistry} from "../PayloadTypeRegistry.ts";
import type {ClientNetworkHandler} from "../../client/network/ClientNetworkHandler.ts";

export class BatchBufferPacket implements Payload {
    public static readonly ID: PayloadId<BatchBufferPacket> = payloadId('batch_buffer');
    public static readonly CODEC: PacketCodec<BatchBufferPacket> = PacketCodecs.of(this.write, this.read);

    public readonly payloads: Payload[];

    public constructor(payloads: Payload[]) {
        this.payloads = payloads;
    }

    private static read(reader: BinaryReader): BatchBufferPacket {
        const count = reader.readVarUint();
        const payloads: Payload[] = [];

        for (let i = 0; i < count; i++) {
            const index = reader.readVarUint();
            const type = PayloadTypeRegistry.getGlobalByIndex(index);
            if (!type) throw new Error(`Unrecognized packet: ${index}`);

            payloads.push(type.codec.decode(reader));
        }

        return new BatchBufferPacket(payloads);
    }

    private static write(writer: BinaryWriter, value: BatchBufferPacket): void {
        writer.writeVarUint(value.payloads.length);
        for (const payload of value.payloads) {
            const type = PayloadTypeRegistry.getGlobal(payload.getId().id);
            if (!type) throw new Error(`Missing packet type ${payload.getId().id}`);

            writer.writeVarUint(type.index);
            type.codec.encode(writer, payload);
        }
    }

    public getId(): PayloadId<BatchBufferPacket> {
        return BatchBufferPacket.ID;
    }

    public accept(_listener: ClientNetworkHandler): void {
    }
}