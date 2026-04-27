import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class PlayerSetScoreS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerSetScoreS2CPacket> = payloadId('player_set_score');
    public static readonly CODEC: PacketCodec<PlayerSetScoreS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.VAR_UINT,
        val => val.score,
        to => new PlayerSetScoreS2CPacket(to)
    );

    public readonly score: number;

    public constructor(score: number) {
        this.score = score;
    }

    public getId(): PayloadId<PlayerSetScoreS2CPacket> {
        return PlayerSetScoreS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onPlayerScore(this);
    }
}