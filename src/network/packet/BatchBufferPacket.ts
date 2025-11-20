import type {Payload, PayloadId} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";
import type {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../nbt/BinaryReader.ts";
import {PayloadTypeRegistry} from "../PayloadTypeRegistry.ts";

export class BatchBufferPacket implements Payload {
    public static readonly ID: PayloadId<BatchBufferPacket> = {id: Identifier.ofVanilla('batch_b')};
    public static readonly CODEC: PacketCodec<BatchBufferPacket> = PacketCodecs.of(this.write, this.read);

    public readonly payloads: Payload[];

    public constructor(payloads: Payload[]) {
        this.payloads = payloads;
    }

    private static read(reader: BinaryReader): BatchBufferPacket {
        const count = reader.readVarUInt();
        const payloads: Payload[] = [];

        for (let i = 0; i < count; i++) {
            const idStr = reader.readString();
            const id = Identifier.tryParse(idStr);
            if (!id) throw new Error(`Unrecognized packet: ${idStr}`);

            const type = PayloadTypeRegistry.getGlobal(id);
            if (!type) throw new Error(`Unrecognized packet: ${idStr}`);

            payloads.push(type.codec.decode(reader));
        }

        return new BatchBufferPacket(payloads);
    }

    private static write(writer: BinaryWriter, value: BatchBufferPacket): void {
        writer.writeVarUInt(value.payloads.length);
        for (const payload of value.payloads) {
            const type = PayloadTypeRegistry.getGlobal(payload.getId().id);
            if (!type) throw new Error(`Missing packet type ${payload.getId().id}`);

            writer.writeString(type.id.toString());
            type.codec.encode(writer, payload);

        }
    }

    public getId(): PayloadId<BatchBufferPacket> {
        return BatchBufferPacket.ID;
    }
}