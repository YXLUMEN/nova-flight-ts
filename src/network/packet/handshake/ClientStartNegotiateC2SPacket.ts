import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ServerHandshakeHandler} from "../../../server/network/handler/ServerHandshakeHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ClientStartNegotiateC2SPacket implements Payload {
    public static readonly INSTANCE = new ClientStartNegotiateC2SPacket();
    public static readonly ID: PayloadType<ClientStartNegotiateC2SPacket> = payloadType('client_start_negotiate');
    public static readonly CODEC: PacketCodec<ClientStartNegotiateC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ClientStartNegotiateC2SPacket> {
        return ClientStartNegotiateC2SPacket.ID;
    }

    public accept(listener: ServerHandshakeHandler): void {
        listener.onClientStartNegotiate(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public inTransition(): boolean {
        return true;
    }
}