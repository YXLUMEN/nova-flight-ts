import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class EntitiesRemoveS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntitiesRemoveS2CPacket> = payloadType('entities_remove');
    public static readonly CODEC: PacketCodec<EntitiesRemoveS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.collection(PacketCodecs.VAR_UINT),
        val => val.entityIds,
        val => new EntitiesRemoveS2CPacket(val)
    );

    public readonly entityIds: number[];

    public constructor(id: number[]) {
        this.entityIds = id;
    }

    public type(): PayloadType<EntitiesRemoveS2CPacket> {
        return EntitiesRemoveS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onEntitiesRemove(this);
    }

    public estimateSize(): number {
        return 5 * this.entityIds.length;
    }
}