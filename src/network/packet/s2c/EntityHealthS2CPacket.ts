import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class EntityHealthS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntityHealthS2CPacket> = payloadType('entity_health');
    public static readonly CODEC: PacketCodec<EntityHealthS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.FLOAT,
        val => val.amount,
        EntityHealthS2CPacket.new
    );

    public readonly entityId: number;
    public readonly amount: number;

    public constructor(entityId: number, amount: number) {
        this.entityId = entityId;
        this.amount = amount;
    }

    public static new(entityId: number, amount: number): EntityHealthS2CPacket {
        return new EntityHealthS2CPacket(entityId, amount);
    }

    public type(): PayloadType<EntityHealthS2CPacket> {
        return EntityHealthS2CPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}