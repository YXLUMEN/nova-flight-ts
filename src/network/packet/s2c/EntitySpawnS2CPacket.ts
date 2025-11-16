import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {Registries} from "../../../registry/Registries.ts";
import type {UUID} from "../../../apis/types.ts";
import type {EntityType} from "../../../entity/EntityType.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {decodeVelocity, decodeYaw, encodeVelocity, encodeYaw} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntitySpawnS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntitySpawnS2CPacket> = {id: Identifier.ofVanilla('spawn_entity')};

    public static readonly CODEC: PacketCodec<EntitySpawnS2CPacket> = PacketCodecs.of<EntitySpawnS2CPacket>(this.write, this.read);

    public readonly entityId: number;
    public readonly uuid: UUID;
    public readonly entityType: EntityType<any>;
    public readonly x: number;
    public readonly y: number;
    public readonly color: string;
    public readonly edgeColor: string;
    public readonly entityData: number;
    private readonly velocityXInt16: number;
    private readonly velocityYInt16: number;
    private readonly yawInt8: number;

    protected constructor(
        entityId: number,
        uuid: UUID,
        x: number, y: number, yawInt8: number,
        entityType: EntityType<any>,
        velocityXInt16: number, velocityYInt16: number,
        color: string, edgeColor: string,
        entityData: number,
    ) {
        this.entityId = entityId;
        this.uuid = uuid;
        this.entityType = entityType;
        this.x = x;
        this.y = y;
        this.velocityXInt16 = velocityXInt16;
        this.velocityYInt16 = velocityYInt16;
        this.yawInt8 = yawInt8;
        this.color = color;
        this.edgeColor = edgeColor;
        this.entityData = entityData;
    }

    public static create(entity: Entity, ownerId = 0): EntitySpawnS2CPacket {
        const yaw = encodeYaw(entity.getYaw());
        const vx = encodeVelocity(entity.getVelocityRef.x);
        const vy = encodeVelocity(entity.getVelocityRef.y);

        return new this(
            entity.getId(),
            entity.getUUID(),
            entity.getPositionRef.x,
            entity.getPositionRef.y,
            yaw,
            entity.getType(),
            vx,
            vy,
            entity.color,
            entity.edgeColor,
            ownerId
        );
    }

    protected static read(reader: BinaryReader): EntitySpawnS2CPacket {
        const entityId = reader.readVarUInt();
        const uuid = reader.readUUID();

        const typeId = Identifier.PACKET_CODEC.decode(reader);
        const entityType = Registries.ENTITY_TYPE.getEntryById(typeId)!.getValue();
        const x = reader.readDouble();
        const y = reader.readDouble();
        const yaw = reader.readUnsignByte();
        const velocityX = reader.readInt16();
        const velocityY = reader.readInt16();
        const color = reader.readString();
        const edgeColor = reader.readString();
        const ownerId = reader.readVarUInt();

        return new EntitySpawnS2CPacket(entityId, uuid, x, y, yaw, entityType, velocityX, velocityY, color, edgeColor, ownerId);
    }

    protected static write(writer: BinaryWriter, value: EntitySpawnS2CPacket): void {
        writer.writeVarUInt(value.entityId);
        writer.writeUUID(value.uuid);
        const typeEntry = Registries.ENTITY_TYPE.getId(value.entityType)!;
        Identifier.PACKET_CODEC.encode(writer, typeEntry);
        writer.writeDouble(value.x);
        writer.writeDouble(value.y);
        writer.writeByte(value.yawInt8);
        writer.writeInt16(value.velocityXInt16);
        writer.writeInt16(value.velocityYInt16);
        writer.writeString(value.color);
        writer.writeString(value.edgeColor);
        writer.writeVarUInt(value.entityData);
    }

    public getId(): PayloadId<EntitySpawnS2CPacket> {
        return EntitySpawnS2CPacket.ID;
    }

    public get yaw() {
        return decodeYaw(this.yawInt8);
    }

    public get velocityX() {
        return decodeVelocity(this.velocityXInt16);
    }

    public get velocityY() {
        return decodeVelocity(this.velocityYInt16);
    }
}