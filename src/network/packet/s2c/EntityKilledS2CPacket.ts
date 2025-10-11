import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {EntityDamageS2CPacket} from "./EntityDamageS2CPacket.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityKilledS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityKilledS2CPacket> = {id: Identifier.ofVanilla('entity_killed')};
    public static readonly CODEC: PacketCodec<EntityKilledS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.entityId);
        },
        reader => {
            return new EntityKilledS2CPacket(
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