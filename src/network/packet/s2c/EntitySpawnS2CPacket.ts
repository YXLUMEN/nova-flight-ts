import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import {Registries} from "../../../registry/Registries.ts";
import type {UUID} from "../../../apis/registry.ts";
import type {EntityType} from "../../../entity/EntityType.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {Entity} from "../../../entity/Entity.ts";

export class EntitySpawnS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntitySpawnS2CPacket> = {id: Identifier.ofVanilla('spawn_entity')};

    public static readonly CODEC: PacketCodec<EntitySpawnS2CPacket> = PacketCodec.of<EntitySpawnS2CPacket>(this.write, this.read);

    public readonly entityId: number;
    public readonly uuid: UUID;
    public readonly entityType: EntityType<any>;
    public readonly x: number;
    public readonly y: number;
    public readonly velocityX: number;
    public readonly velocityY: number;
    public readonly yaw: number;

    public constructor(entityId: number, uuid: UUID, x: number, y: number, yaw: number, entityType: EntityType<any>, velocityX: number, velocityY: number) {
        this.entityId = entityId;
        this.uuid = uuid;
        this.entityType = entityType;
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.yaw = yaw;
    }

    public static create(entity: Entity): EntitySpawnS2CPacket {
        return new this(
            entity.getId(),
            entity.getUuid(),
            entity.getPositionRef.x,
            entity.getPositionRef.y,
            entity.getYaw(),
            entity.getType(),
            entity.getVelocityRef.x,
            entity.getVelocityRef.y,
        );
    }

    private static read(reader: BinaryReader): EntitySpawnS2CPacket {
        const entityId = reader.readVarInt();
        const uuid = reader.readString() as UUID;

        const typeId = Identifier.PACKET_CODEC.decode(reader);
        const entityType = Registries.ENTITY_TYPE.getEntryById(typeId)!.getValue();
        const x = reader.readDouble();
        const y = reader.readDouble();
        const yaw = reader.readFloat();
        const velocityX = reader.readDouble();
        const velocityY = reader.readDouble();

        return new EntitySpawnS2CPacket(entityId, uuid, x, y, yaw, entityType, velocityX, velocityY);
    }

    private static write(value: EntitySpawnS2CPacket, writer: BinaryWriter): void {
        writer.writeVarInt(value.entityId);
        writer.writeString(value.uuid);
        const typeEntry = Registries.ENTITY_TYPE.getId(value.entityType)!;
        Identifier.PACKET_CODEC.encode(typeEntry, writer);
        writer.writeDouble(value.x);
        writer.writeDouble(value.y);
        writer.writeFloat(value.yaw);
        writer.writeDouble(value.velocityX);
        writer.writeDouble(value.velocityY);
    }

    public getId(): PayloadId<EntitySpawnS2CPacket> {
        return EntitySpawnS2CPacket.ID;
    }
}