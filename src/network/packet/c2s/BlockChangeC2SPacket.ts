import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {BlockPos} from "../../../world/map/BlockPos.ts";

export class BlockChangeC2SPacket implements Payload {
    public static readonly ID: PayloadId<BlockChangeC2SPacket> = payloadId('block_change_c');
    public static readonly CODEC: PacketCodec<BlockChangeC2SPacket> = PacketCodecs.adapt3(
        PacketCodecs.UINT8,
        val => val.type,
        PacketCodecs.UINT32,
        val => val.x,
        PacketCodecs.UINT32,
        val => val.y,
        BlockChangeC2SPacket.new
    );

    public readonly type: number;
    public readonly x: number;
    public readonly y: number;

    public constructor(type: number, x: number, y: number) {
        this.type = type;
        this.x = x;
        this.y = y;
    }

    public static new(type: number, x: number, y: number): BlockChangeC2SPacket {
        return new BlockChangeC2SPacket(type, x, y);
    }

    public static from(type: number, pos: BlockPos): BlockChangeC2SPacket {
        return new BlockChangeC2SPacket(type, pos.getX(), pos.getY());
    }

    public getId(): PayloadId<BlockChangeC2SPacket> {
        return BlockChangeC2SPacket.ID;
    }
}