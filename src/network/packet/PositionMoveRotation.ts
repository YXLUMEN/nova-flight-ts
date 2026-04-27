import {type Payload, payloadId, type PayloadId} from "../Payload.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";

export class PositionMoveRotation implements Payload {
    public static readonly ID: PayloadId<PositionMoveRotation> = payloadId('position_move_rotation');
    public static readonly CODEC: PacketCodec<PositionMoveRotation> = PacketCodecs.adapt3(
        PacketCodecs.VECTOR2D,
        val => val.position,
        PacketCodecs.VECTOR2D,
        val => val.delta,
        PacketCodecs.FLOAT,
        val => val.yaw,
        PositionMoveRotation.new
    );

    public readonly position: Vec2;
    public readonly delta: Vec2;
    public readonly yaw: number;

    public constructor(position: Vec2, delta: Vec2, yaw: number) {
        this.position = position;
        this.delta = delta;
        this.yaw = yaw;
    }

    public static new(position: Vec2, delta: Vec2, yaw: number) {
        return new PositionMoveRotation(position, delta, yaw);
    }

    public getId(): PayloadId<any> {
        return PositionMoveRotation.ID;
    }

    public accept(): void {
    }
}