import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import {decodeVelocity, encodeVelocity} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityVelocityUpdateS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityVelocityUpdateS2CPacket> = {id: Identifier.ofVanilla('entity_velocity')};
    public static readonly CODEC: PacketCodec<EntityVelocityUpdateS2CPacket> = PacketCodecs.of<EntityVelocityUpdateS2CPacket>(this.write, this.reader);

    public readonly entityId: number;
    private readonly velocityXInt16: number;
    private readonly velocityYInt16: number;

    public constructor(entityId: number, velocityXInt16: number, velocityYInt16: number) {
        this.entityId = entityId;
        this.velocityXInt16 = velocityXInt16;
        this.velocityYInt16 = velocityYInt16;
    }

    public get velocityX() {
        return decodeVelocity(this.velocityXInt16);
    }

    public get velocityY() {
        return decodeVelocity(this.velocityYInt16);
    }

    public static create(entity: Entity) {
        const vel = entity.getVelocityRef;
        return new EntityVelocityUpdateS2CPacket(entity.getId(), encodeVelocity(vel.x), encodeVelocity(vel.y));
    }

    private static reader(reader: BinaryReader) {
        return new EntityVelocityUpdateS2CPacket(
            reader.readVarUInt(),
            reader.readInt16(),
            reader.readInt16()
        )
    }

    private static write(value: EntityVelocityUpdateS2CPacket, writer: BinaryWriter): void {
        writer.writeVarUInt(value.entityId);
        writer.writeInt16(value.velocityXInt16);
        writer.writeInt16(value.velocityYInt16);
    }

    public getId(): PayloadId<EntityVelocityUpdateS2CPacket> {
        return EntityVelocityUpdateS2CPacket.ID;
    }
}