import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export abstract class PlayerMoveC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerMoveC2SPacket> = payloadId('player_move');

    public readonly dx: number;
    public readonly dy: number;
    public readonly yaw: number;

    public readonly changePosition: boolean;
    public readonly changeYaw: boolean;

    protected constructor(dx: number, dy: number, yaw: number, changePosition: boolean, changeYaw: boolean) {
        this.dx = dx;
        this.dy = dy;
        this.yaw = yaw;
        this.changePosition = changePosition;
        this.changeYaw = changeYaw;
    }

    public abstract getId(): PayloadId<PlayerMoveC2SPacket>;
}

export class FullMove extends PlayerMoveC2SPacket {
    public static readonly ID: PayloadId<FullMove> = payloadId('player_move_full');
    public static readonly CODEC: PacketCodec<FullMove> = PacketCodecs.of(
        (writer, value) => {
            writer.writeInt8(value.dx);
            writer.writeInt8(value.dy);
            writer.writeFloat(value.yaw);
        },
        reader => {
            return new FullMove(
                reader.readInt8(),
                reader.readInt8(),
                reader.readFloat()
            )
        }
    );

    public constructor(dx: number, dy: number, yaw: number) {
        super(dx, dy, yaw, true, true);
    }

    public override getId(): PayloadId<FullMove> {
        return FullMove.ID;
    }
}

export class PositionOnly extends PlayerMoveC2SPacket {
    public static readonly ID: PayloadId<PositionOnly> = payloadId('player_move_pos');
    public static readonly CODEC: PacketCodec<PositionOnly> = PacketCodecs.adapt2(
        PacketCodecs.INT8,
        val => val.dx,
        PacketCodecs.INT8,
        val => val.dy,
        PositionOnly.new
    );

    public constructor(dx: number, dy: number) {
        super(dx, dy, 0, true, false);
    }

    public static new(dx: number, dy: number): PositionOnly {
        return new PositionOnly(dx, dy);
    }

    public override getId(): PayloadId<PlayerMoveC2SPacket> {
        return PositionOnly.ID;
    }
}

export class Steering extends PlayerMoveC2SPacket {
    public static readonly ID: PayloadId<Steering> = payloadId('player_move_steering');
    public static readonly CODEC: PacketCodec<Steering> = PacketCodecs.adapt(
        PacketCodecs.FLOAT,
        val => val.yaw,
        val => new Steering(val)
    );

    public constructor(yaw: number) {
        super(0, 0, yaw, false, true);
    }

    public override getId(): PayloadId<Steering> {
        return Steering.ID;
    }
}