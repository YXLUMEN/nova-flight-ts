import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class ServerStartS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerStartS2CPacket();
    public static readonly ID: PayloadId<ServerStartS2CPacket> = payloadId('server_start');
    public static readonly CODEC: PacketCodec<ServerStartS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public getId(): PayloadId<ServerStartS2CPacket> {
        return ServerStartS2CPacket.ID;
    }

    public canProcessInTransition(): boolean {
        return true;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onServerStart(this);
    }

    public estimateSize(): number {
        return 0;
    }
}