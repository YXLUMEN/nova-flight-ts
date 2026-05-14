import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {BlockPos} from "../../../world/map/BlockPos.ts";
import type {BlockChange} from "../../../world/map/BlockChange.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class BlockChangeS2CPacket implements Payload {
    public static readonly ID: PayloadType<BlockChangeS2CPacket> = payloadType('block_change');
    public static readonly CODEC: PacketCodec<BlockChangeS2CPacket> = PacketCodecs.adapt3(
        PacketCodecs.UINT8,
        val => val.block,
        PacketCodecs.UINT32,
        val => val.x,
        PacketCodecs.UINT32,
        val => val.y,
        BlockChangeS2CPacket.new
    );

    public readonly block: number;
    public readonly x: number;
    public readonly y: number;

    public constructor(type: number, x: number, y: number) {
        this.block = type;
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

    public type(): PayloadType<BlockChangeS2CPacket> {
        return BlockChangeS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onBlockChange(this);
    }

    public estimateSize(): number {
        return 9;
    }
}