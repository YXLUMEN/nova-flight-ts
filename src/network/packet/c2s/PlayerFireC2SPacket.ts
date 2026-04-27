import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerFireC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerFireC2SPacket> = payloadId('player_fire');
    public static readonly CODEC: PacketCodec<PlayerFireC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.BOOL,
        val => val.start,
        to => new PlayerFireC2SPacket(to)
    );

    public readonly start: boolean;

    public constructor(start: boolean) {
        this.start = start;
    }

    public getId(): PayloadId<PlayerFireC2SPacket> {
        return PlayerFireC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onPlayerFire(this);
    }
}