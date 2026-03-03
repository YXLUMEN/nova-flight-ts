import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class KeepAliveS2CPacket implements Payload {
    public static readonly ID: PayloadId<KeepAliveS2CPacket> = payloadId('keep_alive_s2c');
    public static readonly CODEC: PacketCodec<KeepAliveS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.UINT32,
        val => val.id,
        val => new KeepAliveS2CPacket(val)
    );
    public readonly id: number;

    public constructor(id: number) {
        this.id = id;
    }

    public getId(): PayloadId<KeepAliveS2CPacket> {
        return KeepAliveS2CPacket.ID;
    }
}