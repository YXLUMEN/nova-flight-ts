import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class KeepAliveS2CPacket implements Payload {
    public static readonly ID: PayloadType<KeepAliveS2CPacket> = payloadType('keep_alive_s2c');
    public static readonly CODEC: PacketCodec<KeepAliveS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.UINT32,
        val => val.id,
        val => new KeepAliveS2CPacket(val)
    );
    public readonly id: number;

    public constructor(id: number) {
        this.id = id;
    }

    public type(): PayloadType<KeepAliveS2CPacket> {
        return KeepAliveS2CPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}