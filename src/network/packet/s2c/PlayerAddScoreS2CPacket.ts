import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerAddScoreS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerAddScoreS2CPacket> = {id: Identifier.ofVanilla('player_add_score')};
    public static readonly CODEC: PacketCodec<PlayerAddScoreS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.BOOL,
        val => val.decrease,
        PacketCodecs.VAR_UINT,
        val => val.score,
        PlayerAddScoreS2CPacket.new
    );

    public readonly decrease: boolean;
    public readonly score: number;

    public constructor(decrease: boolean, score: number) {
        this.decrease = decrease;
        this.score = score;
    }

    public static new(decrease: boolean, score: number) {
        return new PlayerAddScoreS2CPacket(decrease, score);
    }

    public getId(): PayloadId<PlayerAddScoreS2CPacket> {
        return PlayerAddScoreS2CPacket.ID;
    }
}