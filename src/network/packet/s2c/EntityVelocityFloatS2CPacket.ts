import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityVelocityFloatS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityVelocityFloatS2CPacket> = {id: Identifier.ofVanilla('entity_velocity_float')};
    public static readonly CODEC: PacketCodec<EntityVelocityFloatS2CPacket> = PacketCodecs.of<EntityVelocityFloatS2CPacket>(this.write, this.reader);

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
        return new EntityVelocityFloatS2CPacket(entity.getId(), vel.x, vel.y);
    }

    private static reader(reader: BinaryReader) {
        return new EntityVelocityFloatS2CPacket(
            reader.readVarUint(),
            reader.readFloat(),
            reader.readFloat(),
        )
    }

    private static write(writer: BinaryWriter, value: EntityVelocityFloatS2CPacket): void {
        writer.writeVarUint(value.entityId);
        writer.writeFloat(value.velocityX);
        writer.writeFloat(value.velocityY);
    }

    public getId(): PayloadId<EntityVelocityFloatS2CPacket> {
        return EntityVelocityFloatS2CPacket.ID;
    }
}