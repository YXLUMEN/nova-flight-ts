import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";
import {varUintSize} from "../../../utils/NetUtil.ts";

export class JoinGameS2CPacket implements Payload {
    public static readonly ID: PayloadType<JoinGameS2CPacket> = payloadType('join_game');
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

    public type(): PayloadType<JoinGameS2CPacket> {
        return JoinGameS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        void listener.onGameJoin(this);
    }

    public estimateSize(): number {
        return varUintSize(this.playerEntityId) + (this.worldName.length << 2);
    }
}