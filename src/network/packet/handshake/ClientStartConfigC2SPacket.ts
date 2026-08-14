import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerHandshakeHandler} from "../../../server/network/handler/ServerHandshakeHandler.ts";

export class ClientStartConfigC2SPacket implements Payload {
    public static readonly INSTANCE = new ClientStartConfigC2SPacket();
    public static readonly ID: PayloadType<ClientStartConfigC2SPacket> = payloadType('client_start_config');
    public static readonly CODEC: PacketCodec<ClientStartConfigC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ClientStartConfigC2SPacket> {
        return ClientStartConfigC2SPacket.ID;
    }

    public accept(listener: ServerHandshakeHandler): void {
        listener.onClientPromoteToConfig?.(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public canProcessInTransition(): boolean {
        return true;
    }
}