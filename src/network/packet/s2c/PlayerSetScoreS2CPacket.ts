import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class PlayerSetScoreS2CPacket implements Payload {
    public static readonly ID: PayloadType<PlayerSetScoreS2CPacket> = payloadType('player_set_score');
    public static readonly CODEC: PacketCodec<PlayerSetScoreS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.VAR_UINT,
        val => val.score,
        to => new PlayerSetScoreS2CPacket(to)
    );

    public readonly score: number;

    public constructor(score: number) {
        this.score = score;
    }

    public type(): PayloadType<PlayerSetScoreS2CPacket> {
        return PlayerSetScoreS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onPlayerScore(this);
    }
}