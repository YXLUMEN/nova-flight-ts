import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {IVec} from "../../../utils/math/IVec.ts";

export class EntityDamageS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityDamageS2CPacket> = {id: Identifier.ofVanilla('entity_damage')};
    public static readonly CODEC: PacketCodec<EntityDamageS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.entityId);
            PacketCodecs.VECTOR2D.encode(writer, value.pos);
            writer.writeVarUInt(value.damage);
        },
        reader => {
            return new EntityDamageS2CPacket(
                reader.readVarUInt(),
                PacketCodecs.VECTOR2D.decode(reader),
                reader.readVarUInt()
            )
        }
    );

    public readonly entityId: number;
    public readonly pos: IVec;
    public readonly damage: number;

    public constructor(entityId: number, pos: IVec, damage: number) {
        this.entityId = entityId;
        this.pos = pos;
        this.damage = damage;
    }

    public getId(): PayloadId<any> {
        return EntityDamageS2CPacket.ID;
    }
}