import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {EntitySpawnS2CPacket} from "./EntitySpawnS2CPacket.ts";
import type {Entity} from "../../../entity/Entity.ts";

export class EntityBatchSpawnS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityBatchSpawnS2CPacket> = {id: Identifier.ofVanilla('spawn_entity_batch')};
    public static readonly CODEC: PacketCodec<EntityBatchSpawnS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.entities.length);
            for (const packet of value.entities) {
                EntitySpawnS2CPacket.CODEC.encode(writer, packet);
            }
        },
        reader => {
            const count = reader.readVarUInt();
            const entities: EntitySpawnS2CPacket[] = [];
            for (let i = 0; i < count; i++) {
                const spawn = EntitySpawnS2CPacket.CODEC.decode(reader);
                entities.push(spawn);
            }
            return new EntityBatchSpawnS2CPacket(entities);
        }
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