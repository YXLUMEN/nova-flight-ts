import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/types.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityRemoveS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityRemoveS2CPacket> = {id: Identifier.ofVanilla('entity_remove')};
    public static readonly CODEC: PacketCodec<EntityRemoveS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.id);
            writer.writeUUID(value.uuid);
        },
        reader => {
            return new EntityRemoveS2CPacket(
                reader.readVarUInt(),
                reader.readUUID()
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