import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {IVec} from "../../../utils/math/IVec.ts";
import {clamp} from "../../../utils/math/math.ts";

export class EntityDamageS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityDamageS2CPacket> = {id: Identifier.ofVanilla('entity_damage')};
    public static readonly CODEC: PacketCodec<EntityDamageS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.entityId);
            PacketCodecs.VECTOR2D.encode(writer, value.pos);
            writer.writeUint16(value.damageUint16);
        },
        reader => {
            return new EntityDamageS2CPacket(
                reader.readVarUInt(),
                PacketCodecs.VECTOR2D.decode(reader),
                reader.readUint16()
            )
        }
    );

    public readonly entityId: number;
    public readonly pos: IVec;
    private readonly damageUint16: number;

    public constructor(entityId: number, pos: IVec, damageUint16: number) {
        this.entityId = entityId;
        this.pos = pos;
        this.damageUint16 = damageUint16;
    }

    public static create(entityId: number, pos: IVec, damage: number) {
        return new EntityDamageS2CPacket(
            entityId,
            pos,
            clamp((damage * 10) | 0, 0, 65535)
        );
    }

    public getId(): PayloadId<any> {
        return EntityDamageS2CPacket.ID;
    }

    public get damage() {
        return this.damageUint16 / 10;
    }
}