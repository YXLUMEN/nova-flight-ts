import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {BlockPos} from "../../../world/section/pos/BlockPos.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class BlockChangeC2SPacket implements Payload {
    public static readonly ID: PayloadType<BlockChangeC2SPacket> = payloadType('block_change_c');
    public static readonly CODEC: PacketCodec<BlockChangeC2SPacket> = PacketCodecs.adapt3(
        PacketCodecs.UINT8,
        val => val.block,
        PacketCodecs.UINT32,
        val => val.x,
        PacketCodecs.UINT32,
        val => val.y,
        BlockChangeC2SPacket.new
    );

    public readonly block: number;
    public readonly x: number;
    public readonly y: number;

    public constructor(type: number, x: number, y: number) {
        this.block = type;
        this.x = x;
        this.y = y;
    }

    public static new(type: number, x: number, y: number): BlockChangeC2SPacket {
        return new BlockChangeC2SPacket(type, x, y);
    }

    public static from(type: number, pos: BlockPos): BlockChangeC2SPacket {
        return new BlockChangeC2SPacket(type, pos.x, pos.y);
    }

    public type(): PayloadType<BlockChangeC2SPacket> {
        return BlockChangeC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler) {
        listener.onPlaceBlock(this);
    }

    public estimateSize(): number {
        return 9;
    }
}