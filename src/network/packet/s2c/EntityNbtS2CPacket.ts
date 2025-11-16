import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {NbtCompound} from "../../../nbt/NbtCompound.ts";

export class EntityNbtS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityNbtS2CPacket> = {id: Identifier.ofVanilla('entity_nbt')};
    public static readonly CODEC: PacketCodec<EntityNbtS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeUUID(value.entityUUID);
            writer.pushBytes(value.nbt.toBinary());
        },
        reader => {
            return new EntityNbtS2CPacket(reader.readUUID(), NbtCompound.fromReader(reader));
        }
    );

    public readonly entityUUID: UUID;
    public readonly nbt: NbtCompound;

    public constructor(entityUUID: UUID, nbt: NbtCompound) {
        this.entityUUID = entityUUID;
        this.nbt = nbt;
    }

    public static create(entity: Entity) {
        const nbt = new NbtCompound();
        return new EntityNbtS2CPacket(
            entity.getUUID(),
            entity.writeNBT(nbt)
        );
    }

    public getId(): PayloadId<any> {
        return EntityNbtS2CPacket.ID;
    }
}