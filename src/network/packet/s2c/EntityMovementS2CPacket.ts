import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class EntityMovementS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntityMovementS2CPacket> = payloadType('entity_movement');
    public static readonly CODEC: PacketCodec<EntityMovementS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.FLOAT,
        val => val.speed,
        EntityMovementS2CPacket.new
    );

    public readonly entityId: number;
    public readonly speed: number;

    public constructor(entityId: number, speed: number) {
        this.entityId = entityId;
        this.speed = speed;
    }

    public static create(entity: Entity) {
        return new EntityMovementS2CPacket(entity.getId(), entity.getMovementSpeed());
    }

    public static new(entityId: number, speed: number) {
        return new EntityMovementS2CPacket(entityId, speed);
    }

    public type(): PayloadType<EntityMovementS2CPacket> {
        return EntityMovementS2CPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}