import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientConfigHandler} from "../../../client/network/handler/ClientConfigHandler.ts";

export class ServerReadyS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerReadyS2CPacket();
    public static readonly ID: PayloadType<ServerReadyS2CPacket> = payloadType('server_ready');
    public static readonly CODEC: PacketCodec<ServerReadyS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ServerReadyS2CPacket> {
        return ServerReadyS2CPacket.ID;
    }

    public accept(listener: ClientConfigHandler): void {
        listener.onServerReady(this);
    }

    public estimateSize(): number {
        return 0;
    }
}