import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {IVec} from "../../../utils/math/IVec.ts";

export class EntityChooseTargetS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityChooseTargetS2CPacket> = {id: Identifier.ofVanilla('entity_choose_target')};
    public static readonly CODEC: PacketCodec<EntityChooseTargetS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.entityId);
            PacketCodecs.VECTOR2D.encode(writer, value.target);
        },
        reader => {
            return new EntityChooseTargetS2CPacket(
                reader.readVarUint(),
                PacketCodecs.VECTOR2D.decode(reader)
            )
        }
    );

    public readonly entityId: number;
    public readonly target: IVec;

    public constructor(entityId: number, target: IVec) {
        this.entityId = entityId;
        this.target = target;
    }

    public getId(): PayloadId<any> {
        return EntityChooseTargetS2CPacket.ID;
    }
}