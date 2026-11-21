import type {Payload} from "../../Payload.ts";
import type {ClientHandshakeHandler} from "../../../client/network/handler/ClientHandshakeHandler.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class ServerAllowNegotiateS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerAllowNegotiateS2CPacket();
    public static readonly ID: PayloadType<ServerAllowNegotiateS2CPacket> = payloadType('server_allow_negotiate');
    public static readonly CODEC: PacketCodec<ServerAllowNegotiateS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ServerAllowNegotiateS2CPacket> {
        return ServerAllowNegotiateS2CPacket.ID;
    }

    public accept(listener: ClientHandshakeHandler): void {
        listener.onAllowNegotiate(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public protocol(): ConnectionState {
        return ConnectionState.HANDSHAKING;
    }
}