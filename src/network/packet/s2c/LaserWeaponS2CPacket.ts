import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {Vec2} from "../../../utils/math/Vec2.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export abstract class LaserWeaponS2CPacket implements Payload {
    public readonly laserId: number;
    public readonly start: Vec2;
    public readonly end: Vec2;
    public readonly width: number;
    public readonly color: string;
    public readonly activate: boolean;
    public readonly change: boolean

    protected constructor(entityId: number, start: Vec2, end: Vec2, width: number, color: string, activate: boolean, change: boolean) {
        this.laserId = entityId;
        this.start = start;
        this.end = end;
        this.width = width;
        this.color = color;
        this.activate = activate;
        this.change = change;
    }

    public abstract type(): PayloadType<LaserWeaponS2CPacket>;

    public accept(listener: ClientPlayHandler): void {
        listener.onLaserWeapon(this);
    }
}

export class LaserWeaponActivate extends LaserWeaponS2CPacket {
    public static readonly ID: PayloadType<LaserWeaponActivate> = payloadType('laser_activate');
    public static readonly CODEC: PacketCodec<LaserWeaponActivate> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.laserId);
            PacketCodecs.VECTOR2F.encode(writer, value.start);
            PacketCodecs.VECTOR2F.encode(writer, value.end);
            writer.writeVarUint(value.width);
            PacketCodecs.COLOR_HEX.encode(writer, value.color);
        },
        reader => {
            return new LaserWeaponActivate(
                reader.readVarUint(),
                PacketCodecs.VECTOR2F.decode(reader),
                PacketCodecs.VECTOR2F.decode(reader),
                reader.readVarUint(),
                PacketCodecs.COLOR_HEX.decode(reader),
            );
        }
    );

    public constructor(entityId: number, start: Vec2, end: Vec2, width: number, color: string) {
        super(entityId, start, end, width, color, true, false);
    }

    public type(): PayloadType<LaserWeaponActivate> {
        return LaserWeaponActivate.ID;
    }
}

export class LaserWeaponDeactivate extends LaserWeaponS2CPacket {
    public static readonly ID: PayloadType<LaserWeaponDeactivate> = payloadType('laser_deactivate');
    public static readonly CODEC: PacketCodec<LaserWeaponDeactivate> = PacketCodecs.adapt(
        PacketCodecs.VAR_UINT,
        val => val.laserId,
        val => new LaserWeaponDeactivate(val)
    );

    public constructor(entityId: number) {
        super(entityId, Vec2.ZERO, Vec2.ZERO, 0, '', false, false);
    }

    public type(): PayloadType<LaserWeaponDeactivate> {
        return LaserWeaponDeactivate.ID;
    }
}

export class LaserWeaponChange extends LaserWeaponS2CPacket {
    public static readonly ID: PayloadType<LaserWeaponChange> = payloadType('laser_change');
    public static readonly CODEC: PacketCodec<LaserWeaponChange> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.laserId);
            PacketCodecs.VECTOR2F.encode(writer, value.start);
            PacketCodecs.VECTOR2F.encode(writer, value.end);
        },
        reader => {
            return new LaserWeaponChange(
                reader.readVarUint(),
                PacketCodecs.VECTOR2F.decode(reader),
                PacketCodecs.VECTOR2F.decode(reader)
            );
        }
    );

    public constructor(entityId: number, start: Vec2, end: Vec2) {
        super(entityId, start, end, 0, '', false, true);
    }

    public type(): PayloadType<LaserWeaponChange> {
        return LaserWeaponChange.ID;
    }
}