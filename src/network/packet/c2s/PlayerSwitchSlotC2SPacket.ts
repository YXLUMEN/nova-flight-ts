import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerSwitchSlotC2SPacket implements Payload {
    public static readonly ID: PayloadType<PlayerSwitchSlotC2SPacket> = payloadType('player_switch_slot');
    public static readonly CODEC: PacketCodec<PlayerSwitchSlotC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.INT8,
        val => val.slot,
        to => new PlayerSwitchSlotC2SPacket(to)
    );

    public readonly slot: number;

    public constructor(slot: number) {
        this.slot = slot;
    }

    public type(): PayloadType<PlayerSwitchSlotC2SPacket> {
        return PlayerSwitchSlotC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onPlayerSwitchSlot(this);
    }
}