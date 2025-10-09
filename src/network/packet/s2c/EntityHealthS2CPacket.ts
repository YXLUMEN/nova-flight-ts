import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";

export class EntityHealthS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityHealthS2CPacket> = {id: Identifier.ofVanilla('entity_health')};
    public static readonly CODEC: PacketCodec<EntityHealthS2CPacket> = PacketCodec.of(
        (value, writer) => {
            writer.writeVarInt(value.id);
            writer.writeFloat(value.amount);
        },
        reader => {
            return new EntityHealthS2CPacket(
                reader.readVarInt(),
                reader.readFloat()
            )
        }
    );

    public readonly id: number;
    public readonly amount: number;

    public constructor(id: number, amount: number) {
        this.id = id;
        this.amount = amount;
    }

    public getId(): PayloadId<EntityHealthS2CPacket> {
        return EntityHealthS2CPacket.ID;
    }
}