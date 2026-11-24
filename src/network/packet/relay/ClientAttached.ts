import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ServerRelayHandler} from "../../../server/network/handler/ServerRelayHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ClientAttached implements RelayPayload {
    public static readonly ID: PayloadType<ClientAttached> = payloadType('client_attached');
    public static readonly CODEC: PacketCodec<ClientAttached> = PacketCodecs.adapt2(
        PacketCodecs.UINT32,
        val => val.token,
        PacketCodecs.IPV4,
        val => val.host,
        (sid, host) => new ClientAttached(sid, host)
    );

    public readonly token: number;
    public readonly host: string;

    private constructor(token: number, host: string) {
        this.token = token;
        this.host = host;
    }

    public type(): PayloadType<ClientAttached> {
        return ClientAttached.ID;
    }

    public accept(listener: ServerRelayHandler): void {
        listener.onClientAttached(this);
    }
}