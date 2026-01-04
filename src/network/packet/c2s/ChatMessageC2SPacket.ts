import {payloadId, type Payload, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ChatMessageC2SPacket implements Payload {
    public static readonly ID: PayloadId<ChatMessageC2SPacket> = payloadId('chat_msg_c');
    public static readonly CODEC: PacketCodec<ChatMessageC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.msg,
        to => new ChatMessageC2SPacket(to)
    );

    public readonly msg: string;

    public constructor(message: string) {
        this.msg = message;
    }

    public getId(): PayloadId<ChatMessageC2SPacket> {
        return ChatMessageC2SPacket.ID;
    }
}