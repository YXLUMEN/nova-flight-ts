import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityDamageS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityDamageS2CPacket> = {id: Identifier.ofVanilla('entity_damage')};
    public static readonly CODEC: PacketCodec<EntityDamageS2CPacket> = PacketCodecs.of(
        (value, writer) => {
            writer.writeVarUInt(value.entityId);
        },
        reader => {
            return new EntityDamageS2CPacket(
                reader.readVarUInt()
            )
        }
    );

    public readonly entityId: number;

    public constructor(entityId: number) {
        this.entityId = entityId;
    }

    public getId(): PayloadId<any> {
        return EntityDamageS2CPacket.ID;
    }
}