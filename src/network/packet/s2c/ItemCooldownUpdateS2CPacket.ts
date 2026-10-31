import type {Payload} from "../../Payload.ts";
import type {Item} from "../../../item/Item.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ItemCodec} from "../../../item/ItemCodec.ts";

export class ItemCooldownUpdateS2CPacket implements Payload {
    public static readonly ID: PayloadType<ItemCooldownUpdateS2CPacket> = payloadType('item_cooldown_update');
    public static readonly CODEC: PacketCodec<ItemCooldownUpdateS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            ItemCodec.ITEM_VALUE_PACKET_CODEC.encode(writer, value.item);
            writer.writeVarUint(value.duration);
        },
        reader => {
            return new ItemCooldownUpdateS2CPacket(
                ItemCodec.ITEM_VALUE_PACKET_CODEC.decode(reader),
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

    public type(): PayloadType<any> {
        return ItemCooldownUpdateS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onItemCooldown(this);
    }

    public estimateSize(): number {
        return 8;
    }
}