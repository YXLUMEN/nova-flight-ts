import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import {EntityDamageS2CPacket} from "./EntityDamageS2CPacket.ts";

export class EntityKilledS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityKilledS2CPacket> = {id: Identifier.ofVanilla('entity_killed')};
    public static readonly CODEC: PacketCodec<EntityKilledS2CPacket> = PacketCodec.of(
        (value, writer) => {
            writer.writeVarInt(value.entityId);
        },
        reader => {
            return new EntityKilledS2CPacket(
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