import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {decodeYaw, encodeYaw} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class EntityPositionS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntityPositionS2CPacket> = payloadType('entity_position');
    public static readonly CODEC: PacketCodec<EntityPositionS2CPacket> = PacketCodecs.of<EntityPositionS2CPacket>(this.write, this.reader);

    public readonly entityId: number;
    public readonly x: number;
    public readonly y: number;
    private readonly yawInt8: number;

    public constructor(entityId: number, x: number, y: number, yawInt8: number) {
        this.entityId = entityId;
        this.x = x;
        this.y = y;
        this.yawInt8 = yawInt8;
    }

    public static create(entity: Entity) {
        const pos = entity.positionRef;
        const x = pos.x;
        const y = pos.y;
        const yaw = encodeYaw(entity.getYaw());
        return new EntityPositionS2CPacket(entity.getId(), x, y, yaw);
    }

    private static reader(reader: BinaryReader) {
        return new EntityPositionS2CPacket(
            reader.readVarUint(),
            reader.readDouble(),
            reader.readDouble(),
            reader.readUint8()
        )
    }

    private static write(writer: BinaryWriter, value: EntityPositionS2CPacket): void {
        writer.writeVarUint(value.entityId);
        writer.writeDouble(value.x);
        writer.writeDouble(value.y);
        writer.writeInt8(value.yawInt8);
    }

    public type(): PayloadType<EntityPositionS2CPacket> {
        return EntityPositionS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onEntityPosition(this);
    }

    public estimateSize(): number {
        return 24;
    }

    public get yaw() {
        return decodeYaw(this.yawInt8);
    }
}