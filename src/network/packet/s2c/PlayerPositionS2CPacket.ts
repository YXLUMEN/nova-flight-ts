import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {PositionMoveRotation} from "../PositionMoveRotation.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class PlayerPositionS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerPositionS2CPacket> = payloadId('player_position');
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

    public getId(): PayloadId<any> {
        return PlayerPositionS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onPlayerMove(this);
    }
}