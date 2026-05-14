import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerFinishLoginC2SPacket implements Payload {
    public static readonly INSTANCE = new PlayerFinishLoginC2SPacket();
    public static readonly ID: PayloadType<PlayerFinishLoginC2SPacket> = payloadType('player_finish_login');
    public static readonly CODEC: PacketCodec<PlayerFinishLoginC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<PlayerFinishLoginC2SPacket> {
        return PlayerFinishLoginC2SPacket.ID;
    }

    public canProcessInTransition(): boolean {
        return true;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onPlayerFinishLogin(this);
    }
}