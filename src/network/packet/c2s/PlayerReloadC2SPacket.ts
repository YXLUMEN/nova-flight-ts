import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerReloadC2SPacket implements Payload {
    public static readonly INSTANCE = new PlayerReloadC2SPacket();
    public static readonly ID: PayloadId<PlayerReloadC2SPacket> = payloadId('player_reload');
    public static readonly CODEC: PacketCodec<PlayerReloadC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public getId(): PayloadId<PlayerReloadC2SPacket> {
        return PlayerReloadC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onPlayerReload(this);
    }
}