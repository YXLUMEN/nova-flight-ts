import {payloadId, type Payload, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerFinishLoginC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerFinishLoginC2SPacket> = payloadId('player_finish_login');
    public static readonly CODEC: PacketCodec<PlayerFinishLoginC2SPacket> = PacketCodecs.emptyNew(PlayerFinishLoginC2SPacket);

    public getId(): PayloadId<PlayerFinishLoginC2SPacket> {
        return PlayerFinishLoginC2SPacket.ID;
    }
}