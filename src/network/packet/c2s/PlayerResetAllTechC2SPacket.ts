import {payloadId, type Payload, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerResetAllTechC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerResetAllTechC2SPacket> = payloadId('player_reset_all_tech');
    public static readonly CODEC: PacketCodec<PlayerResetAllTechC2SPacket> = PacketCodecs.emptyNew(PlayerResetAllTechC2SPacket);

    public getId(): PayloadId<PlayerResetAllTechC2SPacket> {
        return PlayerResetAllTechC2SPacket.ID;
    }
}