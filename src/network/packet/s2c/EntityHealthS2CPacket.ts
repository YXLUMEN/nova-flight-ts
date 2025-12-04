import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class EntityHealthS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityHealthS2CPacket> = {id: Identifier.ofVanilla('entity_health')};
    public static readonly CODEC: PacketCodec<EntityHealthS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.id);
            writer.writeFloat(value.amount);
        },
        reader => {
            return new EntityHealthS2CPacket(
                reader.readVarUint(),
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