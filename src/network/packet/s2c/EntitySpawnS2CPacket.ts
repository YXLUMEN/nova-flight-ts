import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import {Registries} from "../../../registry/Registries.ts";
import type {UUID} from "../../../apis/registry.ts";
import type {EntityType} from "../../../entity/EntityType.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {decodeYaw, encodeYaw} from "../../../utils/NetUtil.ts";

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
    private readonly yaw: number;
    public readonly color: string;
    public readonly edgeColor: string;
    public readonly ownerId: number;

    public constructor(
        entityId: number,
        uuid: UUID,
        x: number, y: number, yaw: number,
        entityType: EntityType<any>,
        velocityX: number, velocityY: number,
        color: string, edgeColor: string,
        ownerId: number,
    ) {
        this.entityId = entityId;
        this.uuid = uuid;
        this.entityType = entityType;
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.yaw = encodeYaw(yaw);
        this.color = color;
        this.edgeColor = edgeColor;
        this.ownerId = ownerId;
    }

    public static create(entity: Entity, ownerId = 0): EntitySpawnS2CPacket {
        return new this(
            entity.getId(),
            entity.getUuid(),
            entity.getPositionRef.x,
            entity.getPositionRef.y,
            entity.getYaw(),
            entity.getType(),
            entity.getVelocityRef.x,
            entity.getVelocityRef.y,
            entity.color,
            entity.edgeColor,
            ownerId
        );
    }

    private static read(reader: BinaryReader): EntitySpawnS2CPacket {
        const entityId = reader.readVarInt();
        const uuid = reader.readUUID();

        const typeId = Identifier.PACKET_CODEC.decode(reader);
        const entityType = Registries.ENTITY_TYPE.getEntryById(typeId)!.getValue();
        const x = reader.readDouble();
        const y = reader.readDouble();
        const yaw = reader.readUint8();
        const velocityX = reader.readFloat();
        const velocityY = reader.readFloat();
        const color = reader.readString();
        const edgeColor = reader.readString();
        const ownerId = reader.readVarInt();

        return new EntitySpawnS2CPacket(entityId, uuid, x, y, yaw, entityType, velocityX, velocityY, color, edgeColor, ownerId);
    }

    private static write(value: EntitySpawnS2CPacket, writer: BinaryWriter): void {
        writer.writeVarInt(value.entityId);
        writer.writeUUID(value.uuid);
        const typeEntry = Registries.ENTITY_TYPE.getId(value.entityType)!;
        Identifier.PACKET_CODEC.encode(typeEntry, writer);
        writer.writeDouble(value.x);
        writer.writeDouble(value.y);
        writer.writeUint8(value.yaw);
        writer.writeFloat(value.velocityX);
        writer.writeFloat(value.velocityY);
        writer.writeString(value.color);
        writer.writeString(value.edgeColor);
        writer.writeVarInt(value.ownerId);
    }

    public getId(): PayloadId<EntitySpawnS2CPacket> {
        return EntitySpawnS2CPacket.ID;
    }

    public getYaw() {
        return decodeYaw(this.yaw);
    }
}