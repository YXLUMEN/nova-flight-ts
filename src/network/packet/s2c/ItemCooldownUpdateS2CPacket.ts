import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {Item} from "../../../item/Item.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class ItemCooldownUpdateS2CPacket implements Payload {
    public static readonly ID: PayloadId<ItemCooldownUpdateS2CPacket> = payloadId('item_cooldown_update');
    public static readonly CODEC: PacketCodec<ItemCooldownUpdateS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            ItemStack.ITEM_VALUE_PACKET_CODEC.encode(writer, value.item);
            writer.writeVarUint(value.duration);
        },
        reader => {
            return new ItemCooldownUpdateS2CPacket(
                ItemStack.ITEM_VALUE_PACKET_CODEC.decode(reader),
                reader.readVarUint()
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

    public accept(listener: ClientNetworkHandler): void {
        listener.onItemCooldown(this);
    }

    public estimateSize(): number {
        return 8;
    }
}