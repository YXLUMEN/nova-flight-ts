import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {decodeVelocity, encodeVelocity} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

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
        const vel = entity.velocityRef;
        return new EntityVelocityUpdateS2CPacket(entity.getId(), encodeVelocity(vel.x), encodeVelocity(vel.y));
    }

    public static createWithVec(entity: Entity, velocity: Vec2) {
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

    public accept(listener: ClientNetworkHandler): void {
        listener.onEntityVelocityUpdate(this);
    }

    public estimateSize(): number {
        return 8;
    }

    public get velocityX() {
        return decodeVelocity(this.vXInt16);
    }

    public get velocityY() {
        return decodeVelocity(this.vYInt16);
    }
}