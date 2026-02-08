import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerDisconnectC2SPacket implements Payload {
    public static readonly INSTANCE = new PlayerDisconnectC2SPacket();
    public static readonly ID: PayloadId<PlayerDisconnectC2SPacket> = payloadId('player_disconnect');
    public static readonly CODEC: PacketCodec<PlayerDisconnectC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    public getId(): PayloadId<PlayerDisconnectC2SPacket> {
        return PlayerDisconnectC2SPacket.ID;
    }
}