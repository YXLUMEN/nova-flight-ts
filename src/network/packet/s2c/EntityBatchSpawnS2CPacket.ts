import {payloadId, type Payload, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {EntitySpawnS2CPacket} from "./EntitySpawnS2CPacket.ts";
import type {Entity} from "../../../entity/Entity.ts";

export class EntityBatchSpawnS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityBatchSpawnS2CPacket> = payloadId('spawn_entity_batch');
    public static readonly CODEC: PacketCodec<EntityBatchSpawnS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.collection(EntitySpawnS2CPacket.CODEC),
        val => val.entities,
        val => new EntityBatchSpawnS2CPacket(val)
    );

    public readonly entities: EntitySpawnS2CPacket[];

    public constructor(entities: EntitySpawnS2CPacket[]) {
        this.entities = entities;
    }

    public static create(entities: Iterable<Entity>) {
        const list = [...entities];
        return new EntityBatchSpawnS2CPacket(
            list.map(entity => entity.createSpawnPacket())
        );
    }

    public getId(): PayloadId<any> {
        return EntityBatchSpawnS2CPacket.ID;
    }
}