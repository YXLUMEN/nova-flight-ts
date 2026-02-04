import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class JoinGameS2CPacket implements Payload {
    public static readonly ID: PayloadId<JoinGameS2CPacket> = payloadId('join_game');
    public static readonly CODEC: PacketCodec<JoinGameS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.playerEntityId,
        PacketCodecs.STRING,
        val => val.worldName,
        JoinGameS2CPacket.new
    );

    public readonly playerEntityId: number;
    public readonly worldName: string;

    public constructor(playerEntityId: number, worldName: string) {
        this.playerEntityId = playerEntityId;
        this.worldName = worldName;
    }

    public static new(playerEntityId: number, worldName: string) {
        return new JoinGameS2CPacket(playerEntityId, worldName)
    }

    public getId(): PayloadId<JoinGameS2CPacket> {
        return JoinGameS2CPacket.ID;
    }
}