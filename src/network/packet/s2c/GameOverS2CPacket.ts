import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class GameOverS2CPacket implements Payload {
    public static readonly INSTANCE = new GameOverS2CPacket();
    public static readonly ID: PayloadId<GameOverS2CPacket> = payloadId('game_over');
    public static readonly CODEC: PacketCodec<GameOverS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public getId(): PayloadId<GameOverS2CPacket> {
        return GameOverS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onGameOver();
    }
}