import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {BlockPos} from "../../../world/map/BlockPos.ts";
import type {BlockChange} from "../../../world/map/BlockChange.ts";

export class BlockChangeS2CPacket implements Payload {
    public static readonly ID: PayloadId<BlockChangeS2CPacket> = payloadId('block_change');
    public static readonly CODEC: PacketCodec<BlockChangeS2CPacket> = PacketCodecs.adapt3(
        PacketCodecs.UINT8,
        val => val.type,
        PacketCodecs.UINT32,
        val => val.x,
        PacketCodecs.UINT32,
        val => val.y,
        BlockChangeS2CPacket.new
    );

    public readonly type: number;
    public readonly x: number;
    public readonly y: number;

    public constructor(type: number, x: number, y: number) {
        this.type = type;
        this.x = x;
        this.y = y;
    }

    public static new(type: number, x: number, y: number): BlockChangeS2CPacket {
        return new BlockChangeS2CPacket(type, x, y);
    }

    public static from(type: number, pos: BlockPos): BlockChangeS2CPacket {
        return new BlockChangeS2CPacket(type, pos.getX(), pos.getY());
    }

    public static fromChange(change: BlockChange): BlockChangeS2CPacket {
        return new BlockChangeS2CPacket(change.type, change.x, change.y);
    }

    public getId(): PayloadId<BlockChangeS2CPacket> {
        return BlockChangeS2CPacket.ID;
    }

    public estimateSize(): number {
        return 9;
    }
}