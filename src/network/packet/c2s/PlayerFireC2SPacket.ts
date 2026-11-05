import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerFireC2SPacket implements Payload {
    public static readonly START = new PlayerFireC2SPacket(true);
    public static readonly END = new PlayerFireC2SPacket(false);

    public static readonly ID: PayloadType<PlayerFireC2SPacket> = payloadType('player_fire');
    public static readonly CODEC: PacketCodec<PlayerFireC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.BOOL,
        val => val.start,
        to => new PlayerFireC2SPacket(to)
    );

    public readonly start: boolean;

    private constructor(start: boolean) {
        this.start = start;
    }

    public type(): PayloadType<PlayerFireC2SPacket> {
        return PlayerFireC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onPlayerFire(this);
    }
}