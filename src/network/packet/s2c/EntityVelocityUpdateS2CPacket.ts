import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import {decodeVelocity, encodeVelocity} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {IVec} from "../../../utils/math/IVec.ts";

export class EntityVelocityUpdateS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityVelocityUpdateS2CPacket> = payloadId('entity_velocity');
    public static readonly CODEC: PacketCodec<EntityVelocityUpdateS2CPacket> = PacketCodecs.of<EntityVelocityUpdateS2CPacket>(this.write, this.reader);

    public readonly entityId: number;
    private readonly vXInt16: number;
    private readonly vYInt16: number;

    public constructor(entityId: number, velocityXInt16: number, velocityYInt16: number) {
        this.entityId = entityId;
        this.vXInt16 = velocityXInt16;
        this.vYInt16 = velocityYInt16;
    }

    public static create(entity: Entity) {
        const vel = entity.getVelocityRef;
        return new EntityVelocityUpdateS2CPacket(entity.getId(), encodeVelocity(vel.x), encodeVelocity(vel.y));
    }

    public static createWithVec(entity: Entity, velocity: IVec) {
        return new EntityVelocityUpdateS2CPacket(entity.getId(), encodeVelocity(velocity.x), encodeVelocity(velocity.y));
    }

    private static reader(reader: BinaryReader) {
        return new EntityVelocityUpdateS2CPacket(
            reader.readVarUint(),
            reader.readInt16(),
            reader.readInt16()
        )
    }

    private static write(writer: BinaryWriter, value: EntityVelocityUpdateS2CPacket): void {
        writer.writeVarUint(value.entityId);
        writer.writeInt16(value.vXInt16);
        writer.writeInt16(value.vYInt16);
    }

    public getId(): PayloadId<EntityVelocityUpdateS2CPacket> {
        return EntityVelocityUpdateS2CPacket.ID;
    }

    public get velocityX() {
        return decodeVelocity(this.vXInt16);
    }

    public get velocityY() {
        return decodeVelocity(this.vYInt16);
    }
}