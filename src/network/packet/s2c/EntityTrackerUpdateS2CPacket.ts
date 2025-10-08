import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "../../../entity/data/DataTracker.ts";

export class EntityTrackerUpdateS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityTrackerUpdateS2CPacket> = {id: Identifier.ofVanilla('entity_tracker_update')};
    public static readonly CODEC: PacketCodec<EntityTrackerUpdateS2CPacket> = PacketCodec.of<EntityTrackerUpdateS2CPacket>(this.write, this.reader);

    public readonly entityId: number;
    public readonly trackedValues: DataTrackerSerializedEntry<any>[];

    public constructor(entityId: number, trackedValues: DataTrackerSerializedEntry<any>[]) {
        this.entityId = entityId;
        this.trackedValues = trackedValues;
    }

    private static reader(reader: BinaryReader) {
        const entityId = reader.readVarInt();

        const list: DataTrackerSerializedEntry<any>[] = [];
        let i = reader.readUint8();
        while (i != 255) {
            list.push(DataTracker.SerializedEntry.read(reader, i));
            i = reader.readUint8();
        }

        return new EntityTrackerUpdateS2CPacket(entityId, list);
    }

    private static write(value: EntityTrackerUpdateS2CPacket, writer: BinaryWriter): void {
        writer.writeVarInt(value.entityId);
        for (const entry of value.trackedValues) {
            entry.write(writer);
        }
        writer.writeUint8(255);
    }

    public getId(): PayloadId<EntityTrackerUpdateS2CPacket> {
        return EntityTrackerUpdateS2CPacket.ID;
    }
}