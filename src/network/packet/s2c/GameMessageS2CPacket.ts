import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class GameMessageS2CPacket implements Payload {
    public static readonly ID: PayloadType<GameMessageS2CPacket> = payloadType('game_msg');
    public static readonly CODEC: PacketCodec<GameMessageS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        from => from.value,
        to => new GameMessageS2CPacket(to)
    );

    public readonly value: string;

    public constructor(value: string) {
        this.value = value;
    }

    public type(): PayloadType<GameMessageS2CPacket> {
        return GameMessageS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onGameMessage(this);
    }
}