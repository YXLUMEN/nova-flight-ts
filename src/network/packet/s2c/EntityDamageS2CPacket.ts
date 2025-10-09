import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";

export class EntityDamageS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityDamageS2CPacket> = {id: Identifier.ofVanilla('entity_damage')};
    public static readonly CODEC: PacketCodec<EntityDamageS2CPacket> = PacketCodec.of(
        (value, writer) => {
            writer.writeVarInt(value.entityId);
        },
        reader => {
            return new EntityDamageS2CPacket(
                reader.readVarInt()
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