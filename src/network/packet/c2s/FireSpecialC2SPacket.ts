import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {Item} from "../../../item/Item.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class FireSpecialC2SPacket implements Payload {
    public static readonly ID: PayloadId<FireSpecialC2SPacket> = payloadId('fire_special');
    public static readonly CODEC: PacketCodec<FireSpecialC2SPacket> = PacketCodecs.adapt(
        ItemStack.ITEM_VALUE_PACKET_CODEC,
        val => val.item,
        val => new FireSpecialC2SPacket(val)
    );

    public readonly item: Item;

    public constructor(item: Item) {
        this.item = item;
    }

    public getId(): PayloadId<FireSpecialC2SPacket> {
        return FireSpecialC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onPlayerFireSpecial(this);
    }
}