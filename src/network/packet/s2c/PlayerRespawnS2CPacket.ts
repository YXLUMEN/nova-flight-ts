import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class PlayerRespawnS2CPacket implements Payload {
    public static readonly INSTANCE = new PlayerRespawnS2CPacket();
    public static readonly ID: PayloadType<PlayerRespawnS2CPacket> = payloadType('player_respawn');
    public static readonly CODEC: PacketCodec<PlayerRespawnS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<PlayerRespawnS2CPacket> {
        return PlayerRespawnS2CPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}