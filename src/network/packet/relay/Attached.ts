import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RelayPayload} from "../../RelayPayload.ts";

export class Attached implements RelayPayload {
    public static readonly TYPE_ID = 0x01;
    public static readonly ID: PayloadType<Attached> = payloadType('attached');
    public static readonly CODEC: PacketCodec<Attached> = PacketCodecs.adapt(
        PacketCodecs.UINT8,
        val => val.sessionId,
        val => new Attached(val)
    );

    public readonly sessionId: number;

    private constructor(sessionId: number) {
        this.sessionId = sessionId;
    }

    public type(): PayloadType<Attached> {
        return Attached.ID;
    }

    public accept(): void {
    }
}