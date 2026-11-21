import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ServerNegotiateHandler} from "../../../server/network/handler/ServerNegotiateHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class ClientStartConfigC2SPacket implements Payload {
    public static readonly INSTANCE = new ClientStartConfigC2SPacket();
    public static readonly ID: PayloadType<ClientStartConfigC2SPacket> = payloadType('client_start_config');
    public static readonly CODEC: PacketCodec<ClientStartConfigC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ClientStartConfigC2SPacket> {
        return ClientStartConfigC2SPacket.ID;
    }

    public accept(listener: ServerNegotiateHandler): void {
        listener.onClientPromoteToConfig(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public protocol(): ConnectionState {
        return ConnectionState.NEGOTIATION;
    }
}