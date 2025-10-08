import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";

export class EntityVelocityUpdateS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityVelocityUpdateS2CPacket> = {id: Identifier.ofVanilla('entity_velocity')};
    public static readonly CODEC: PacketCodec<EntityVelocityUpdateS2CPacket> = PacketCodec.of<EntityVelocityUpdateS2CPacket>(this.write, this.reader);

    public readonly entityId: number;
    public readonly velocityX: number;
    public readonly velocityY: number;

    public constructor(entityId: number, velocityX: number, velocityY: number) {
        this.entityId = entityId;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
    }

    public static create(entity: Entity) {
        const vel = entity.getVelocityRef;
        return new EntityVelocityUpdateS2CPacket(entity.getId(), vel.x, vel.y,);
    }

    private static reader(reader: BinaryReader) {
        return new EntityVelocityUpdateS2CPacket(
            reader.readVarInt(),
            reader.readFloat(),
            reader.readFloat()
        )
    }

    private static write(value: EntityVelocityUpdateS2CPacket, writer: BinaryWriter): void {
        writer.writeVarInt(value.entityId);
        writer.writeFloat(value.velocityX);
        writer.writeFloat(value.velocityY);
    }

    public getId(): PayloadId<EntityVelocityUpdateS2CPacket> {
        return EntityVelocityUpdateS2CPacket.ID;
    }
}