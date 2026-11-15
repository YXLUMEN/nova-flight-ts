import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ServerConfigHandler} from "../../../server/network/handler/ServerConfigHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class ClientStartPlayC2SPacket implements Payload {
    public static readonly INSTANCE = new ClientStartPlayC2SPacket();
    public static readonly ID: PayloadType<ClientStartPlayC2SPacket> = payloadType('client_start_play');
    public static readonly CODEC: PacketCodec<ClientStartPlayC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ClientStartPlayC2SPacket> {
        return ClientStartPlayC2SPacket.ID;
    }

    public accept(listener: ServerConfigHandler): void {
        listener.onClientConfirm?.(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public protocol(): ConnectionState {
        return ConnectionState.CONFIGURATION;
    }
}