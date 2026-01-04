import {type Payload, payloadId, type PayloadId} from "../Payload.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";

/**
 * 由中继服务器发送, 前端在任何条件下都不应该调用.
 * 永远返回字符串;
 * */
export class RelayServerPacket implements Payload {
    public static readonly ID: PayloadId<RelayServerPacket> = payloadId('relay_server');
    public static readonly CODEC: PacketCodec<RelayServerPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.msg,
        val => new RelayServerPacket(val)
    );

    public readonly msg: string;

    public constructor(msg: string) {
        this.msg = msg;
    }

    public getId(): PayloadId<RelayServerPacket> {
        return RelayServerPacket.ID;
    }
}