import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {Item} from "../../../item/Item.ts";
import {Registries} from "../../../registry/Registries.ts";

export class ItemCooldownUpdateS2CPacket implements Payload {
    public static readonly ID: PayloadId<ItemCooldownUpdateS2CPacket> = {id: Identifier.ofVanilla('item_c_u')};
    public static readonly CODEC: PacketCodec<ItemCooldownUpdateS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            PacketCodecs.registryEntry(Registries.ITEM).encode(writer, value.item);
            writer.writeVarUInt(value.duration);
        },
        reader => {
            return new ItemCooldownUpdateS2CPacket(
                PacketCodecs.registryEntry(Registries.ITEM).decode(reader),
                reader.readVarUInt()
            )
        }
    );

    public readonly item: Item;
    public readonly duration: number;

    public constructor(item: Item, duration: number) {
        this.item = item;
        this.duration = duration;
    }

    public getId(): PayloadId<any> {
        return ItemCooldownUpdateS2CPacket.ID;
    }
}