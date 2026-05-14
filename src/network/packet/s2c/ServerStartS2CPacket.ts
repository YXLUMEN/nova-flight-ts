import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientConfigHandler} from "../../../client/network/handler/ClientConfigHandler.ts";

export class ServerStartS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerStartS2CPacket();
    public static readonly ID: PayloadType<ServerStartS2CPacket> = payloadType('server_start');
    public static readonly CODEC: PacketCodec<ServerStartS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ServerStartS2CPacket> {
        return ServerStartS2CPacket.ID;
    }

    public canProcessInTransition(): boolean {
        return true;
    }

    public accept(listener: ClientConfigHandler): void {
        listener.onServerStart(this);
    }

    public estimateSize(): number {
        return 0;
    }
}