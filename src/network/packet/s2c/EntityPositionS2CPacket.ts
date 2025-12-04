import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import {decodeYaw, encodeYaw} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityPositionS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityPositionS2CPacket> = {id: Identifier.ofVanilla('entity_position')};
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
        const pos = entity.getPositionRef;
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
            reader.readUnsignByte()
        )
    }

    private static write(writer: BinaryWriter, value: EntityPositionS2CPacket): void {
        writer.writeVarUint(value.entityId);
        writer.writeDouble(value.x);
        writer.writeDouble(value.y);
        writer.writeByte(value.yawInt8);
    }

    public getId(): PayloadId<EntityPositionS2CPacket> {
        return EntityPositionS2CPacket.ID;
    }

    public get yaw() {
        return decodeYaw(this.yawInt8);
    }
}