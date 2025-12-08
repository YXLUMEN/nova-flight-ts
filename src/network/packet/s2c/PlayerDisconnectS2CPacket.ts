import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";

export class PlayerDisconnectS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerDisconnectS2CPacket> = {id: Identifier.ofVanilla('player_disconnect')};
    public static readonly CODEC: PacketCodec<PlayerDisconnectS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.UUID,
        val => val.uuid,
        PacketCodecs.STRING,
        val => val.reason,
        PlayerDisconnectS2CPacket.new
    );

    public readonly uuid: UUID;
    public readonly reason: string;

    public constructor(uuid: UUID, reason: string = '') {
        this.uuid = uuid;
        this.reason = reason;
    }

    public static new(uuid: UUID, reason: string = '') {
        return new PlayerDisconnectS2CPacket(uuid, reason);
    }

    public getId(): PayloadId<PlayerDisconnectS2CPacket> {
        return PlayerDisconnectS2CPacket.ID;
    }
}