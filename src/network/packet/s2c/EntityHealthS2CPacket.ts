import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityHealthS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityHealthS2CPacket> = {id: Identifier.ofVanilla('entity_health')};
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

    public getId(): PayloadId<EntityHealthS2CPacket> {
        return EntityHealthS2CPacket.ID;
    }
}