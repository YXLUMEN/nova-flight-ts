import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ServerRelayHandler} from "../../../server/network/handler/ServerRelayHandler.ts";

export class ClientAttached implements RelayPayload {
    public static readonly TYPE_ID = 0x02;
    public static readonly ID: PayloadType<ClientAttached> = payloadType('client_attached');
    public static readonly CODEC: PacketCodec<ClientAttached> = PacketCodecs.adapt2(
        PacketCodecs.UINT8,
        val => val.sessionId,
        PacketCodecs.UUID,
        val => val.uuid,
        ClientAttached.new
    );

    public readonly sessionId: number;
    public readonly uuid: UUID;

    private constructor(sessionId: number, uuid: UUID) {
        this.sessionId = sessionId;
        this.uuid = uuid;
    }

    private static new(sessionId: number, uuid: UUID) {
        return new ClientAttached(sessionId, uuid);
    }

    public type(): PayloadType<ClientAttached> {
        return ClientAttached.ID;
    }

    public accept(listener: ServerRelayHandler): void {
        listener.onClientAttached(this);
    }
}