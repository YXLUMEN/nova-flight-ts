import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class RequestTeleportC2SPacket implements Payload {
    public static readonly INSTANCE = new RequestTeleportC2SPacket();
    public static readonly ID: PayloadId<RequestTeleportC2SPacket> = payloadId('request_teleport');
    public static readonly CODEC: PacketCodec<RequestTeleportC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public getId(): PayloadId<RequestTeleportC2SPacket> {
        return RequestTeleportC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onRequestTeleport(this);
    }
}