import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ServerNegotiateHandler} from "../../../server/network/handler/ServerNegotiateHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ClientFinishNegC2SPacket implements Payload {
    public static readonly INSTANCE = new ClientFinishNegC2SPacket();
    public static readonly ID: PayloadType<ClientFinishNegC2SPacket> = payloadType('client_finish_neg');
    public static readonly CODEC: PacketCodec<ClientFinishNegC2SPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ClientFinishNegC2SPacket> {
        return ClientFinishNegC2SPacket.ID;
    }

    public accept(listener: ServerNegotiateHandler): void {
        listener.onClientFinishNegotiate();
    }

    public estimateSize(): number {
        return 0;
    }

    public inTransition(): boolean {
        return true;
    }
}