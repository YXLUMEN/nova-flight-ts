import {payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RelayPayload} from "../../RelayPayload.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";
import type {ServerNetworkManager} from "../../../server/network/ServerNetworkManager.ts";

export class RelayMessage implements RelayPayload {
    public static readonly TYPE_ID = 0x03;
    public static readonly ID: PayloadId<RelayMessage> = payloadId('attached');
    public static readonly CODEC: PacketCodec<RelayMessage> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.msg,
        val => new RelayMessage(val)
    );

    public readonly msg: string;

    public constructor(msg: string) {
        this.msg = msg;
    }

    public getId(): PayloadId<RelayMessage> {
        return RelayMessage.ID;
    }

    public accept(listener: ClientNetworkHandler | ServerNetworkManager): void {
        listener.onRelayMessage(this);
    }
}