import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerRespawnS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerRespawnS2CPacket> = {id: Identifier.ofVanilla('player_respawn')};
    public static readonly CODEC: PacketCodec<PlayerRespawnS2CPacket> = PacketCodecs.empty(PlayerRespawnS2CPacket);

    public getId(): PayloadId<PlayerRespawnS2CPacket> {
        return PlayerRespawnS2CPacket.ID;
    }
}