import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerSwitchSlotC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerSwitchSlotC2SPacket> = payloadId('player_switch_slot');
    public static readonly CODEC: PacketCodec<PlayerSwitchSlotC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.INT8,
        val => val.slot,
        to => new PlayerSwitchSlotC2SPacket(to)
    );

    public readonly slot: number;

    public constructor(slot: number) {
        this.slot = slot;
    }

    public getId(): PayloadId<PlayerSwitchSlotC2SPacket> {
        return PlayerSwitchSlotC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onPlayerSwitchSlot(this);
    }
}