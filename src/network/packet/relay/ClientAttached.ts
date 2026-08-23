import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ServerRelayHandler} from "../../../server/network/handler/ServerRelayHandler.ts";

export class ClientAttached implements RelayPayload {
    public static readonly TYPE_ID = 0x02;
    public static readonly ID: PayloadType<ClientAttached> = payloadType('client_attached');
    public static readonly CODEC: PacketCodec<ClientAttached> = PacketCodecs.adapt(
        PacketCodecs.UINT8,
        val => val.sessionId,
        val => new ClientAttached(val)
    );

    public readonly sessionId: number;

    private constructor(sessionId: number) {
        this.sessionId = sessionId;
    }

    public type(): PayloadType<ClientAttached> {
        return ClientAttached.ID;
    }

    public accept(listener: ServerRelayHandler): void {
        listener.onClientAttached(this);
    }
}