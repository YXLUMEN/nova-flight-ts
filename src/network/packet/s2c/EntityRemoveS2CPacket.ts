import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class EntityRemoveS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntityRemoveS2CPacket> = payloadType('entity_remove');
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

    public type(): PayloadType<EntityRemoveS2CPacket> {
        return EntityRemoveS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onEntityRemove(this);
    }

    public estimateSize(): number {
        // varUint + u16
        return 6 + (this.reason.length << 2);
    }
}