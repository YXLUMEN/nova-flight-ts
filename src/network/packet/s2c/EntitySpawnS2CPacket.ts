import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/types.ts";
import {EntityType} from "../../../entity/EntityType.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {
    decodeColorHex,
    decodeVelocity,
    decodeYaw,
    encodeColorHex,
    encodeVelocity,
    encodeYaw,
    varUintSize
} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {Registries} from "../../../registry/Registries.ts";

export class EntitySpawnS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntitySpawnS2CPacket> = {id: Identifier.ofVanilla('spawn_entity')};

    public static readonly CODEC: PacketCodec<EntitySpawnS2CPacket> = PacketCodecs.of<EntitySpawnS2CPacket>(this.write, this.read);

    public readonly entityId: number;
    public readonly uuid: UUID;
    public readonly entityType: EntityType<any>;
    public readonly x: number;
    public readonly y: number;
    private readonly colorUint32: number;
    private readonly edgeColorInt32: number;
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
        colorInt32: number, edgeColorInt32: number,
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
        this.colorUint32 = colorInt32;
        this.edgeColorInt32 = edgeColorInt32;
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
            encodeColorHex(entity.color.length > 0 ? entity.color : '#fff'),
            encodeColorHex(entity.edgeColor.length > 0 ? entity.edgeColor : '#fff'),
            ownerId
        );
    }

    protected static read(reader: BinaryReader): EntitySpawnS2CPacket {
        const entityId = reader.readVarUint();
        const uuid = reader.readUUID();

        const entityType = EntityType.PACKET_CODEC.decode(reader);
        const x = reader.readDouble();
        const y = reader.readDouble();
        const yaw = reader.readUint8();
        const velocityX = reader.readInt16();
        const velocityY = reader.readInt16();
        const color = reader.readUint32();
        const edgeColor = reader.readUint32();
        const ownerId = reader.readVarUint();

        return new EntitySpawnS2CPacket(entityId, uuid, x, y, yaw, entityType, velocityX, velocityY, color, edgeColor, ownerId);
    }

    protected static write(writer: BinaryWriter, value: EntitySpawnS2CPacket): void {
        writer.writeVarUint(value.entityId);
        writer.writeUUID(value.uuid);
        EntityType.PACKET_CODEC.encode(writer, value.entityType);
        writer.writeDouble(value.x);
        writer.writeDouble(value.y);
        writer.writeInt8(value.yawInt8);
        writer.writeInt16(value.velocityXInt16);
        writer.writeInt16(value.velocityYInt16);
        writer.writeUint32(value.colorUint32);
        writer.writeUint32(value.edgeColorInt32);
        writer.writeVarUint(value.entityData);
    }

    public getId(): PayloadId<EntitySpawnS2CPacket> {
        return EntitySpawnS2CPacket.ID;
    }

    public estimateSize(): number {
        let size = 0;

        // entityId (VarInt)
        size += varUintSize(this.entityId);

        // uuid (16 bytes)
        size += 16;

        // x, y (assume double = 8 bytes each)
        size += 16;

        // yaw (byte)
        size += 1;

        // entityType: Identifier.of("namespace:path") use it index to serialized as VarUint
        size += varUintSize(Registries.ENTITY_TYPE.getIndex(this.entityType));

        // vx, vy Uint16
        size += 4;

        // color & edgeColor: rgbaInt Uint32
        size += 8;

        // entityData (VarInt)
        size += varUintSize(this.entityData);
        return size;
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

    public get color() {
        return decodeColorHex(this.colorUint32);
    }

    public get edgeColor() {
        return decodeColorHex(this.edgeColorInt32);
    }
}