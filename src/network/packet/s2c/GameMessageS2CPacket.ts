import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {type Payload, type PayloadId, payloadId} from "../../Payload.ts";

export class GameMessageS2CPacket implements Payload {
    public static readonly ID: PayloadId<GameMessageS2CPacket> = payloadId('game_msg');
    public static readonly CODEC: PacketCodec<GameMessageS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        from => from.value,
        to => new GameMessageS2CPacket(to)
    );

    public readonly value: string;

    public constructor(value: string) {
        this.value = value;
    }

    public getId(): PayloadId<GameMessageS2CPacket> {
        return GameMessageS2CPacket.ID;
    }
}