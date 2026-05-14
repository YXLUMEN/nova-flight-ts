import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {EntitySpawnS2CPacket} from "./EntitySpawnS2CPacket.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class EntityBatchSpawnS2CPacket implements Payload {
    public static readonly ID: PayloadType<EntityBatchSpawnS2CPacket> = payloadType('spawn_entity_batch');
    public static readonly CODEC: PacketCodec<EntityBatchSpawnS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.collection(EntitySpawnS2CPacket.CODEC),
        val => val.entities,
        val => new EntityBatchSpawnS2CPacket(val)
    );

    public readonly entities: EntitySpawnS2CPacket[];

    public constructor(entities: EntitySpawnS2CPacket[]) {
        this.entities = entities;
    }

    public static new(entities: EntitySpawnS2CPacket[]) {
        return new EntityBatchSpawnS2CPacket(entities);
    }

    public static create(entities: Iterable<Entity>) {
        const list = [...entities];
        return new EntityBatchSpawnS2CPacket(
            list.map(entity => entity.createSpawnPacket())
        );
    }

    public type(): PayloadType<any> {
        return EntityBatchSpawnS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onEntityBatchSpawn(this);
    }

    public estimateSize(): number {
        return this.entities.reduce((acc, entity) => acc + entity.estimateSize(), 0);
    }
}