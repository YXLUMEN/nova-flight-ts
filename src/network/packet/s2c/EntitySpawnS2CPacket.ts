import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {UUID} from "../../../apis/types.ts";
import {EntityType} from "../../../entity/EntityType.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {decodeVelocity, decodeYaw, encodeVelocity, encodeYaw, varUintSize} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {Registries} from "../../../registry/Registries.ts";

export class EntitySpawnS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntitySpawnS2CPacket> = payloadId('spawn_entity');

    public static readonly CODEC: PacketCodec<EntitySpawnS2CPacket> = PacketCodecs.of<EntitySpawnS2CPacket>(this.write, this.read);

    public readonly entityId: number;
    public readonly uuid: UUID;
    public readonly entityType: EntityType<any>;

    public readonly x: number;
    public readonly y: number;
    private readonly vxInt16: number;
    private readonly vyInt16: number;
    private readonly yawInt8: number;

    public readonly color: string;
    public readonly edgeColor: string;
    public readonly entityData: number;

    public constructor(
        entityId: number,
        uuid: UUID,
        x: number, y: number,
        yawInt8: number,
        entityType: EntityType<any>,
        vxInt16: number, vyInt16: number,
        color: string, edgeColor: string,
        entityData: number,
    ) {
        this.entityId = entityId;
        this.uuid = uuid;
        this.entityType = entityType;
        this.x = x;
        this.y = y;
        this.vxInt16 = vxInt16;
        this.vyInt16 = vyInt16;
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
            entity.getX(),
            entity.getY(),
            yaw,
            entity.getType(),
            vx,
            vy,
            entity.color.length > 0 ? entity.color : '#fff',
            entity.edgeColor.length > 0 ? entity.edgeColor : '#fff',
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
        const color = PacketCodecs.COLOR_HEX.decode(reader);
        const edgeColor = PacketCodecs.COLOR_HEX.decode(reader);
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
        writer.writeInt16(value.vxInt16);
        writer.writeInt16(value.vyInt16);
        PacketCodecs.COLOR_HEX.encode(writer, value.color);
        PacketCodecs.COLOR_HEX.encode(writer, value.edgeColor);
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
        return decodeVelocity(this.vxInt16);
    }

    public get velocityY() {
        return decodeVelocity(this.vyInt16);
    }
}