import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class ChatMessageC2SPacket implements Payload {
    public static readonly ID: PayloadType<ChatMessageC2SPacket> = payloadType('chat_msg_c');
    public static readonly CODEC: PacketCodec<ChatMessageC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.msg,
        to => new ChatMessageC2SPacket(to)
    );

    public readonly msg: string;

    public constructor(message: string) {
        this.msg = message;
    }

    public type(): PayloadType<ChatMessageC2SPacket> {
        return ChatMessageC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onChatMessage(this);
    }

    public estimateSize(): number {
        return this.msg.length << 2;
    }
}