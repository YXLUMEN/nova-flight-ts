import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {NbtCompound} from "../../../nbt/NbtCompound.ts";

export class EntityNbtS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityNbtS2CPacket> = {id: Identifier.ofVanilla('entity_nbt')};
    public static readonly CODEC: PacketCodec<EntityNbtS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.UUID,
        val => val.entityUuid,
        PacketCodecs.NBT,
        val => val.nbt,
        EntityNbtS2CPacket.new
    );

    public readonly entityUuid: UUID;
    public readonly nbt: NbtCompound;

    public constructor(entityUuid: UUID, nbt: NbtCompound) {
        this.entityUuid = entityUuid;
        this.nbt = nbt;
    }

    public static new(entityUuid: UUID, nbt: NbtCompound) {
        return new EntityNbtS2CPacket(entityUuid, nbt);
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