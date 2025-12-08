import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {IVec} from "../../../utils/math/IVec.ts";

export class EntityChooseTargetS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityChooseTargetS2CPacket> = {id: Identifier.ofVanilla('entity_choose_target')};
    public static readonly CODEC: PacketCodec<EntityChooseTargetS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.VECTOR2D,
        val => val.target,
        EntityChooseTargetS2CPacket.new
    );

    public readonly entityId: number;
    public readonly target: IVec;

    public constructor(entityId: number, target: IVec) {
        this.entityId = entityId;
        this.target = target;
    }

    public static new(entityId: number, target: IVec) {
        return new EntityChooseTargetS2CPacket(entityId, target);
    }

    public getId(): PayloadId<EntityChooseTargetS2CPacket> {
        return EntityChooseTargetS2CPacket.ID;
    }
}