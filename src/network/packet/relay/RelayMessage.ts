import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ServerRelayHandler} from "../../../server/network/handler/ServerRelayHandler.ts";
import type {ClientCommonHandler} from "../../../client/network/handler/ClientCommonHandler.ts";

export class RelayMessage implements RelayPayload {
    public static readonly TYPE_ID = 0x03;
    public static readonly ID: PayloadType<RelayMessage> = payloadType('attached');
    public static readonly CODEC: PacketCodec<RelayMessage> = PacketCodecs.adapt2(
        PacketCodecs.UINT8,
        val => val.code,
        PacketCodecs.listOf(PacketCodecs.STRING),
        val => val.args,
        (code, args) => new RelayMessage(code, args)
    );

    public readonly code: number;
    public readonly args: string[];

    private constructor(code: number, args: string[]) {
        this.code = code;
        this.args = args;
    }

    public type(): PayloadType<RelayMessage> {
        return RelayMessage.ID;
    }

    public accept(listener: ClientCommonHandler | ServerRelayHandler): void {
        listener.onRelayMessage(this);
    }

    public canProcessInTransition(): boolean {
        return true;
    }
}