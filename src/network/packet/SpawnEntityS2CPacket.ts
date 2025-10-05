import type {Payload} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {PacketCodec} from "../codec/PacketCodec.ts";
import type {Entity} from "../../entity/Entity.ts";
import {NbtCompound} from "../../nbt/NbtCompound.ts";
import {Registries} from "../../registry/Registries.ts";

export class SpawnEntityS2CPacket implements Payload {
    public static readonly ID = Identifier.ofVanilla('spawn_entity');

    public static readonly CODEC: PacketCodec<SpawnEntityS2CPacket> = PacketCodec.of<SpawnEntityS2CPacket>(
        (value, writer) => {
            Identifier.PACKET_CODEC.encode(value.type, writer);
            const nbt = new NbtCompound();
            writer.pushBytes(value.entity.writeNBT(nbt).toBinary());
        },
        (reader) => {
            const id = Identifier.PACKET_CODEC.decode(reader);
            const nbt = NbtCompound.fromBinary(reader.getBuffer())!;
            const type = Registries.ENTITY_TYPE.getEntryById(id)!.getValue().create();
            return new SpawnEntityS2CPacket(id);
        }
    );

    public readonly type: Identifier;
    public readonly entity: Entity;

    public constructor(entity: Entity) {
        this.type = Registries.ENTITY_TYPE.getId(entity.getType())!;
        this.entity = entity;
    }

    public getId(): Identifier {
        return SpawnEntityS2CPacket.ID;
    }
}