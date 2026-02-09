import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";

export class PlayerJoinS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerJoinS2CPacket> = payloadId('player_join');
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

    public getId(): PayloadId<PlayerJoinS2CPacket> {
        return PlayerJoinS2CPacket.ID;
    }
}