import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class TranslatableTextS2CPacket implements Payload {
    public static readonly ID: PayloadId<TranslatableTextS2CPacket> = payloadId('translatable_text');
    public static readonly CODEC: PacketCodec<TranslatableTextS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.STRING,
        val => val.key,
        PacketCodecs.collection(PacketCodecs.STRING),
        val => val.args,
        TranslatableTextS2CPacket.new
    );

    public readonly key: string;
    public readonly args: string[];

    public constructor(key: string, args: string[]) {
        this.key = key;
        this.args = args;
    }

    public static new(key: string, args: string[]) {
        return new TranslatableTextS2CPacket(key, args);
    }

    public getId(): PayloadId<TranslatableTextS2CPacket> {
        return TranslatableTextS2CPacket.ID;
    }
}