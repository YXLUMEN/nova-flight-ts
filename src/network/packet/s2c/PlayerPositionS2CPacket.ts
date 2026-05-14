import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {PositionMoveRotation} from "../PositionMoveRotation.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class PlayerPositionS2CPacket implements Payload {
    public static readonly ID: PayloadType<PlayerPositionS2CPacket> = payloadType('player_position');
    public static readonly CODEC: PacketCodec<PlayerPositionS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.id,
        PositionMoveRotation.CODEC,
        val => val.change,
        PlayerPositionS2CPacket.new
    );

    public readonly id: number;
    public readonly change: PositionMoveRotation;

    public constructor(id: number, change: PositionMoveRotation) {
        this.id = id;
        this.change = change;
    }

    public static new(id: number, change: PositionMoveRotation) {
        return new PlayerPositionS2CPacket(id, change);
    }

    public type(): PayloadType<any> {
        return PlayerPositionS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onPlayerMove(this);
    }
}