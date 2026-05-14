import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class GameOverS2CPacket implements Payload {
    public static readonly INSTANCE = new GameOverS2CPacket();
    public static readonly ID: PayloadType<GameOverS2CPacket> = payloadType('game_over');
    public static readonly CODEC: PacketCodec<GameOverS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<GameOverS2CPacket> {
        return GameOverS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onGameOver(this);
    }
}