import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import {EntityDamageS2CPacket} from "./EntityDamageS2CPacket.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class EntityKilledS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityKilledS2CPacket> = payloadId('entity_killed');
    public static readonly CODEC: PacketCodec<EntityKilledS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        to => new EntityKilledS2CPacket(to)
    );

    public readonly entityId: number;

    public constructor(entityId: number) {
        this.entityId = entityId;
    }

    public getId(): PayloadId<any> {
        return EntityDamageS2CPacket.ID;
    }

    public accept(_listener: ClientNetworkHandler): void {
    }
}