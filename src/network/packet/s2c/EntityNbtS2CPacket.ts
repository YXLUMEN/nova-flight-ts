import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {NbtCompound} from "../../../nbt/element/NbtCompound.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class EntityNbtS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntityNbtS2CPacket> = payloadType('entity_nbt');
    public static readonly CODEC: PacketCodec<EntityNbtS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.NBT,
        val => val.nbt,
        EntityNbtS2CPacket.new
    );

    public readonly entityId: number;
    public readonly nbt: NbtCompound;

    public constructor(entityId: number, nbt: NbtCompound) {
        this.entityId = entityId;
        this.nbt = nbt;
    }

    public static new(entityId: number, nbt: NbtCompound) {
        return new EntityNbtS2CPacket(entityId, nbt);
    }

    public static create(entity: Entity) {
        return new EntityNbtS2CPacket(
            entity.getId(),
            entity.writeNBT(new NbtCompound())
        );
    }

    public type(): PayloadType<any> {
        return EntityNbtS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onEntityNbt(this);
    }

    public estimateSize(): number {
        return 256;
    }
}