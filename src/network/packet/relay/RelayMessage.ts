import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";
import type {ServerRelayHandler} from "../../../server/network/handler/ServerRelayHandler.ts";

export class RelayMessage implements RelayPayload {
    public static readonly TYPE_ID = 0x03;
    public static readonly ID: PayloadType<RelayMessage> = payloadType('attached');
    public static readonly CODEC: PacketCodec<RelayMessage> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.msg,
        val => new RelayMessage(val)
    );

    public readonly msg: string;

    private constructor(msg: string) {
        this.msg = msg;
    }

    public type(): PayloadType<RelayMessage> {
        return RelayMessage.ID;
    }

    public accept(listener: ClientPlayHandler | ServerRelayHandler): void {
        listener.onRelayMessage(this);
    }
}