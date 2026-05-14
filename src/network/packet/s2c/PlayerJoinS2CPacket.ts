import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class PlayerJoinS2CPacket implements Payload {
    public static readonly ID: PayloadType<PlayerJoinS2CPacket> = payloadType('player_join');
    public static readonly CODEC: PacketCodec<PlayerJoinS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.STRING,
        val => val.playerName,
        PacketCodecs.UUID,
        val => val.uuid,
        PlayerJoinS2CPacket.new
    );

    public readonly playerName: string;
    public readonly uuid: UUID;

    public constructor(playerName: string, uuid: UUID) {
        this.playerName = playerName;
        this.uuid = uuid;
    }

    public static new(playerName: string, uuid: UUID) {
        return new PlayerJoinS2CPacket(playerName, uuid);
    }

    public type(): PayloadType<PlayerJoinS2CPacket> {
        return PlayerJoinS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onPlayerJoin(this);
    }
}