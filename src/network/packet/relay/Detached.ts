import {payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ServerNetworkManager} from "../../../server/network/ServerNetworkManager.ts";

export class Detached implements RelayPayload {
    public static readonly TYPE_ID = 0x00;
    public static readonly ID: PayloadId<Detached> = payloadId('detached');
    public static readonly CODEC: PacketCodec<Detached> = PacketCodecs.adapt(
        PacketCodecs.UINT8,
        val => val.sessionId,
        val => new Detached(val)
    );

    public readonly sessionId: number;

    public constructor(sessionId: number) {
        this.sessionId = sessionId;
    }

    public getId(): PayloadId<Detached> {
        return Detached.ID;
    }

    public accept(listener: ServerNetworkManager): void {
        listener.onDetached(this);
    }
}