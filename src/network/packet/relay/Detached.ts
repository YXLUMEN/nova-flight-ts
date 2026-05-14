import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ServerRelayHandler} from "../../../server/network/handler/ServerRelayHandler.ts";

export class Detached implements RelayPayload {
    public static readonly TYPE_ID = 0x00;
    public static readonly ID: PayloadType<Detached> = payloadType('detached');
    public static readonly CODEC: PacketCodec<Detached> = PacketCodecs.adapt(
        PacketCodecs.UINT8,
        val => val.sessionId,
        val => new Detached(val)
    );

    public readonly sessionId: number;

    private constructor(sessionId: number) {
        this.sessionId = sessionId;
    }

    public type(): PayloadType<Detached> {
        return Detached.ID;
    }

    public accept(listener: ServerRelayHandler): void {
        listener.onDetached(this);
    }
}