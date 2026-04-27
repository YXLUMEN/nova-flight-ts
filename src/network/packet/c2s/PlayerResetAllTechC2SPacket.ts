import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerResetAllTechC2SPacket implements Payload {
    public static readonly INSTANCE = new PlayerResetAllTechC2SPacket();
    public static readonly ID: PayloadId<PlayerResetAllTechC2SPacket> = payloadId('player_reset_all_tech');
    public static readonly CODEC: PacketCodec<PlayerResetAllTechC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public getId(): PayloadId<PlayerResetAllTechC2SPacket> {
        return PlayerResetAllTechC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onAllTechRest(this);
    }
}