import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {UUID} from "../../../type/types.ts";
import {EntityType} from "../../../entity/EntityType.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {decodeVelocity, decodeYaw, encodeVelocity, encodeYaw, varUintSize} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {Registries} from "../../../registry/Registries.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

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
    public readonly extraData: Uint8Array | null;

    public constructor(
        entityId: number,
        uuid: UUID,
        x: number, y: number,
        yawInt8: number,
        entityType: EntityType<any>,
        vxInt16: number, vyInt16: number,
        color: string, edgeColor: string,
        entityData: number,
        extraData: Uint8Array | null = null
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
        this.extraData = extraData;
    }

    public static create(entity: Entity, entityData: number = 0, extraData: Uint8Array | null = null): EntitySpawnS2CPacket {
        const yaw = encodeYaw(entity.getYaw());
        const vx = encodeVelocity(entity.velocityRef.x);
        const vy = encodeVelocity(entity.velocityRef.y);

        return new EntitySpawnS2CPacket(
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
            entityData,
            extraData
        );
    }

    protected static read(reader: BinaryReader): EntitySpawnS2CPacket {
        const entityId = reader.readVarUint();
        const uuid: UUID = reader.readUUID();

        const entityType = EntityType.PACKET_CODEC.decode(reader);
        const x = reader.readDouble();
        const y = reader.readDouble();
        const yaw = reader.readUint8();
        const velocityX = reader.readInt16();
        const velocityY = reader.readInt16();
        const color = PacketCodecs.COLOR_HEX.decode(reader);
        const edgeColor = PacketCodecs.COLOR_HEX.decode(reader);
        const data = reader.readVarUint();

        let extra: Uint8Array | null = null;
        const len = reader.readVarUint();
        if (len > 0) extra = reader.readSlice(len);

        return new EntitySpawnS2CPacket(entityId, uuid, x, y, yaw, entityType, velocityX, velocityY, color, edgeColor, data, extra);
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

        if (value.extraData === null) {
            writer.writeVarUint(0);
            return;
        }
        writer.writeVarUint(value.extraData.length);
        writer.pushBytes(value.extraData);
    }

    public getId(): PayloadId<EntitySpawnS2CPacket> {
        return EntitySpawnS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onEntitySpawn(this);
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

        // extraData
        if (this.extraData !== null) {
            size += varUintSize(this.extraData.length);
            size += this.extraData.length;
        } else size += 1;
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