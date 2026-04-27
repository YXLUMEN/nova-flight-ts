import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class EntityRemoveS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityRemoveS2CPacket> = payloadId('entity_remove');
    public static readonly CODEC: PacketCodec<EntityRemoveS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.STRING,
        val => val.reason,
        EntityRemoveS2CPacket.new
    );

    public readonly entityId: number;
    public readonly reason: string;

    public constructor(id: number, reason: string = '') {
        this.entityId = id;
        this.reason = reason;
    }

    public static new(id: number, reason: string = '') {
        return new EntityRemoveS2CPacket(id, reason);
    }

    public getId(): PayloadId<EntityRemoveS2CPacket> {
        return EntityRemoveS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onEntityRemove(this);
    }
}