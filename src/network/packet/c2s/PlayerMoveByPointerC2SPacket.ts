import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {decodeVelocity} from "../../../utils/NetUtil.ts";

export class PlayerMoveByPointerC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerMoveByPointerC2SPacket> = {id: Identifier.ofVanilla('player_vec_move')};
    public static readonly CODEC: PacketCodec<PlayerMoveByPointerC2SPacket> = PacketCodecs.adapt2(
        PacketCodecs.INT16,
        val => val.dxInt16,
        PacketCodecs.INT16,
        val => val.dyInt16,
        PlayerMoveByPointerC2SPacket.new
    );

    private readonly dxInt16: number;
    private readonly dyInt16: number;

    public constructor(dxInt16: number, dyInt6: number) {
        this.dxInt16 = dxInt16;
        this.dyInt16 = dyInt6;
    }

    public static new(dxInt16: number, dyInt6: number) {
        return new PlayerMoveByPointerC2SPacket(dxInt16, dyInt6);
    }

    public getId(): PayloadId<PlayerMoveByPointerC2SPacket> {
        return PlayerMoveByPointerC2SPacket.ID;
    }

    public get dx() {
        return decodeVelocity(this.dxInt16);
    }

    public get dy() {
        return decodeVelocity(this.dyInt16);
    }
}