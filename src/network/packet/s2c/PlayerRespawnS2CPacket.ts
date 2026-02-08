import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerRespawnS2CPacket implements Payload {
    public static readonly INSTANCE = new PlayerRespawnS2CPacket();
    public static readonly ID: PayloadId<PlayerRespawnS2CPacket> = payloadId('player_respawn');
    public static readonly CODEC: PacketCodec<PlayerRespawnS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    public getId(): PayloadId<PlayerRespawnS2CPacket> {
        return PlayerRespawnS2CPacket.ID;
    }
}