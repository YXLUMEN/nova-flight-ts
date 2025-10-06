import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {UUID} from "../../../apis/registry.ts";

export class EntityRemoveS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityRemoveS2CPacket> = {id: Identifier.ofVanilla('entity_remove')};
    public static readonly CODEC: PacketCodec<EntityRemoveS2CPacket> = PacketCodec.of(
        (value, writer) => {
            writer.writeVarInt(value.id);
            writer.writeString(value.uuid);
        },
        reader => {
            return new EntityRemoveS2CPacket(
                reader.readVarInt(),
                reader.readString() as UUID
            )
        }
    );

    public readonly id: number;
    public readonly uuid: UUID;

    public constructor(id: number, uuid: UUID) {
        this.id = id;
        this.uuid = uuid;
    }

    public getId(): PayloadId<EntityRemoveS2CPacket> {
        return EntityRemoveS2CPacket.ID;
    }
}