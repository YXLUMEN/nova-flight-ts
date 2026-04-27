import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class ServerReadyS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerReadyS2CPacket();
    public static readonly ID: PayloadId<ServerReadyS2CPacket> = payloadId('server_ready');
    public static readonly CODEC: PacketCodec<ServerReadyS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public getId(): PayloadId<ServerReadyS2CPacket> {
        return ServerReadyS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onServerReady(this);
    }
}