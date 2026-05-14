import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class KeepAliveC2SPacket implements Payload {
    public static readonly ID: PayloadType<KeepAliveC2SPacket> = payloadType('keep_alive_c2s');
    public static readonly CODEC: PacketCodec<KeepAliveC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.UINT32,
        val => val.id,
        val => new KeepAliveC2SPacket(val)
    );
    public readonly id: number;

    public constructor(id: number) {
        this.id = id;
    }

    public type(): PayloadType<KeepAliveC2SPacket> {
        return KeepAliveC2SPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}