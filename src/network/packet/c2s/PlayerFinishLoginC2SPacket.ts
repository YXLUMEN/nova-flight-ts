import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerFinishLoginC2SPacket implements Payload {
    public static readonly INSTANCE = new PlayerFinishLoginC2SPacket();
    public static readonly ID: PayloadId<PlayerFinishLoginC2SPacket> = payloadId('player_finish_login');
    public static readonly CODEC: PacketCodec<PlayerFinishLoginC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    public getId(): PayloadId<PlayerFinishLoginC2SPacket> {
        return PlayerFinishLoginC2SPacket.ID;
    }
}