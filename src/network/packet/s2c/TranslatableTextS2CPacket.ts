import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class TranslatableTextS2CPacket implements Payload {
    public static readonly ID: PayloadType<TranslatableTextS2CPacket> = payloadType('translatable_text');
    public static readonly CODEC: PacketCodec<TranslatableTextS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.STRING,
        val => val.key,
        PacketCodecs.collection(PacketCodecs.STRING),
        val => val.args,
        TranslatableTextS2CPacket.new
    );

    public readonly key: string;
    public readonly args: string[];

    public constructor(key: string, args?: string[]) {
        this.key = key;
        this.args = args ?? [];
    }

    public static new(key: string, args: string[]): TranslatableTextS2CPacket {
        return new TranslatableTextS2CPacket(key, args);
    }

    public type(): PayloadType<TranslatableTextS2CPacket> {
        return TranslatableTextS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onTranslateText(this);
    }

    public estimateSize(): number {
        return this.args.length === 0 ? this.key.length : this.key.length + 2 + (this.args.length << 2);
    }
}