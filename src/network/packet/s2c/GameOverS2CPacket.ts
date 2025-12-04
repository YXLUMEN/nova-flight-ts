import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class GameOverS2CPacket implements Payload {
    public static readonly ID: PayloadId<GameOverS2CPacket> = {id: Identifier.ofVanilla('game_over')};
    public static readonly CODEC: PacketCodec<GameOverS2CPacket> = PacketCodecs.empty(GameOverS2CPacket);

    public getId(): PayloadId<GameOverS2CPacket> {
        return GameOverS2CPacket.ID;
    }
}