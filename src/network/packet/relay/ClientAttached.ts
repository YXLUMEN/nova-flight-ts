import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ServerRelayHandler} from "../../../server/network/handler/ServerRelayHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ClientAttached implements RelayPayload {
    public static readonly TYPE_ID = 0x02;
    public static readonly ID: PayloadType<ClientAttached> = payloadType('client_attached');
    public static readonly CODEC: PacketCodec<ClientAttached> = PacketCodecs.adapt2(
        PacketCodecs.UINT8,
        val => val.sessionId,
        PacketCodecs.STRING,
        val => val.addr,
        (sid, addr) => new ClientAttached(sid, addr)
    );

    public readonly sessionId: number;
    public readonly addr: string;

    private constructor(sessionId: number, addr: string) {
        this.sessionId = sessionId;
        this.addr = addr;
    }

    public type(): PayloadType<ClientAttached> {
        return ClientAttached.ID;
    }

    public accept(listener: ServerRelayHandler): void {
        listener.onClientAttached(this);
    }
}