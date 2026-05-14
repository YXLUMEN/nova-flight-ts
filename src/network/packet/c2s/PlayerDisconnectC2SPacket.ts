import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerDisconnectC2SPacket implements Payload {
    public static readonly INSTANCE = new PlayerDisconnectC2SPacket();
    public static readonly ID: PayloadType<PlayerDisconnectC2SPacket> = payloadType('player_disconnect');
    public static readonly CODEC: PacketCodec<PlayerDisconnectC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<PlayerDisconnectC2SPacket> {
        return PlayerDisconnectC2SPacket.ID;
    }

    public accept(_listener: ServerPlayHandler): void {
    }
}