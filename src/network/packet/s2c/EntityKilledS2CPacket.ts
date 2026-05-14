import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {EntityDamageS2CPacket} from "./EntityDamageS2CPacket.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class EntityKilledS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntityKilledS2CPacket> = payloadType('entity_killed');
    public static readonly CODEC: PacketCodec<EntityKilledS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        to => new EntityKilledS2CPacket(to)
    );

    public readonly entityId: number;

    public constructor(entityId: number) {
        this.entityId = entityId;
    }

    public type(): PayloadType<any> {
        return EntityDamageS2CPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}