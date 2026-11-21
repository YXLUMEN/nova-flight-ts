import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientHandshakeHandler} from "../../../client/network/handler/ClientHandshakeHandler.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class ServerStartS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerStartS2CPacket();
    public static readonly ID: PayloadType<ServerStartS2CPacket> = payloadType('server_start');
    public static readonly CODEC: PacketCodec<ServerStartS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ServerStartS2CPacket> {
        return ServerStartS2CPacket.ID;
    }

    public accept(listener: ClientHandshakeHandler): void {
        listener.onServerStart?.(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public protocol(): ConnectionState {
        return ConnectionState.HANDSHAKING;
    }
}