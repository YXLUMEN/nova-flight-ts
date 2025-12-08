import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {decodeYaw, encodeYaw} from "../../../utils/NetUtil.ts";

export class EntityPositionForceS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityPositionForceS2CPacket> = {id: Identifier.ofVanilla('entity_position_force')};
    public static readonly CODEC: PacketCodec<EntityPositionForceS2CPacket> = PacketCodecs.of(this.write, this.reader);

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
        const pos = entity.getPositionRef;
        const x = pos.x;
        const y = pos.y;
        const yawByte = encodeYaw(entity.getYaw());
        return new EntityPositionForceS2CPacket(entity.getId(), x, y, yawByte);
    }

    private static reader(reader: BinaryReader) {
        return new EntityPositionForceS2CPacket(
            reader.readVarUint(),
            reader.readDouble(),
            reader.readDouble(),
            reader.readInt8()
        )
    }

    private static write(writer: BinaryWriter, value: EntityPositionForceS2CPacket): void {
        writer.writeVarUint(value.entityId);
        writer.writeDouble(value.x);
        writer.writeDouble(value.y);
        writer.writeInt8(value.yawInt8);
    }

    public getId(): PayloadId<any> {
        return EntityPositionForceS2CPacket.ID;
    }

    public get yaw() {
        return decodeYaw(this.yawInt8);
    }
}