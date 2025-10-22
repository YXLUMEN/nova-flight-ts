import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerSetScoreS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerSetScoreS2CPacket> = {id: Identifier.ofVanilla('player_set_score')};
    public static readonly CODEC: PacketCodec<PlayerSetScoreS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.score);
        },
        reader => new PlayerSetScoreS2CPacket(reader.readVarUInt())
    );

    public readonly score: number;

    public constructor(score: number) {
        this.score = score;
    }

    public getId(): PayloadId<PlayerSetScoreS2CPacket> {
        return PlayerSetScoreS2CPacket.ID;
    }
}