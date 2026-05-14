import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class ServerShutdownS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerShutdownS2CPacket();
    public static readonly ID: PayloadType<ServerShutdownS2CPacket> = payloadType('server_shutdown');
    public static readonly CODEC: PacketCodec<ServerShutdownS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ServerShutdownS2CPacket> {
        return ServerShutdownS2CPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}