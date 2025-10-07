import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";

export class EntityPositionS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityPositionS2CPacket> = {id: Identifier.ofVanilla('entity_posture')};
    public static readonly CODEC: PacketCodec<EntityPositionS2CPacket> = PacketCodec.of<EntityPositionS2CPacket>(this.write, this.reader);

    public readonly entityId: number;
    public readonly x: number;
    public readonly y: number;
    public readonly yaw: number;

    public constructor(entityId: number, x: number, y: number, yaw: number) {
        this.entityId = entityId;
        this.x = x;
        this.y = y;
        this.yaw = yaw;
    }

    public static create(entity: Entity) {
        const pos = entity.getPositionRef;
        const x = pos.x;
        const y = pos.y;
        return new EntityPositionS2CPacket(entity.getId(), x, y, entity.getYaw());
    }

    private static reader(reader: BinaryReader) {
        return new EntityPositionS2CPacket(
            reader.readVarInt(),
            reader.readDouble(),
            reader.readDouble(),
            reader.readFloat()
        )
    }

    private static write(value: EntityPositionS2CPacket, writer: BinaryWriter): void {
        writer.writeVarInt(value.entityId);
        writer.writeDouble(value.x);
        writer.writeDouble(value.y);
        writer.writeFloat(value.yaw);
    }

    public getId(): PayloadId<EntityPositionS2CPacket> {
        return EntityPositionS2CPacket.ID;
    }
}