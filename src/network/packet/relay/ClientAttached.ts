import {payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";
import type {RelayPayload} from "../../RelayPayload.ts";

export class ClientAttached implements RelayPayload {
    public static readonly TYPE_ID = 0x02;
    public static readonly ID: PayloadId<ClientAttached> = payloadId('client_attached');
    public static readonly CODEC: PacketCodec<ClientAttached> = PacketCodecs.adapt2(
        PacketCodecs.UINT8,
        val => val.sessionId,
        PacketCodecs.UUID,
        val => val.uuid,
        ClientAttached.new
    );

    public readonly sessionId: number;
    public readonly uuid: UUID;

    public constructor(sessionId: number, uuid: UUID) {
        this.sessionId = sessionId;
        this.uuid = uuid;
    }

    public static new(sessionId: number, uuid: UUID) {
        return new ClientAttached(sessionId, uuid);
    }

    public getId(): PayloadId<ClientAttached> {
        return ClientAttached.ID;
    }
}