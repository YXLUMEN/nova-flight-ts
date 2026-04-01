import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerInventorySwapC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerInventorySwapC2SPacket> = payloadId('player_inventory_swap');
    public static readonly CODEC: PacketCodec<PlayerInventorySwapC2SPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.to,
        PacketCodecs.VAR_UINT,
        val => val.from,
        PlayerInventorySwapC2SPacket.new
    );

    public readonly to: number;
    public readonly from: number;

    public constructor(to: number, from: number) {
        this.to = to;
        this.from = from;
    }

    public static new(to: number, from: number) {
        return new PlayerInventorySwapC2SPacket(to, from);
    }

    public getId(): PayloadId<PlayerInventorySwapC2SPacket> {
        return PlayerInventorySwapC2SPacket.ID;
    }
}