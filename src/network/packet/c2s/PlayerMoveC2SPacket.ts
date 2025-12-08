import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerMoveC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerMoveC2SPacket> = {id: Identifier.ofVanilla('player_move')};
    public static readonly CODEC: PacketCodec<PlayerMoveC2SPacket> = PacketCodecs.adapt2(
        PacketCodecs.INT8,
        val => val.dx,
        PacketCodecs.INT8,
        val => val.dy,
        PlayerMoveC2SPacket.new
    );

    public readonly dx: number;
    public readonly dy: number;

    public constructor(dx: number, dy: number) {
        this.dx = dx;
        this.dy = dy;
    }

    public static new(dx: number, dy: number) {
        return new PlayerMoveC2SPacket(dx, dy);
    }

    public getId(): PayloadId<PlayerMoveC2SPacket> {
        return PlayerMoveC2SPacket.ID;
    }
}