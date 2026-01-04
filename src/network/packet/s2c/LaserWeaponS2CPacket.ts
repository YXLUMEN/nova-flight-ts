import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {IVec} from "../../../utils/math/IVec.ts";
import {Vec2} from "../../../utils/math/Vec2.ts";

export abstract class LaserWeaponS2CPacket implements Payload {
    public readonly entityId: number;
    public readonly start: IVec;
    public readonly end: IVec;
    public readonly width: number;
    public readonly color: number;
    public readonly activate: boolean;
    public readonly change: boolean

    protected constructor(entityId: number, start: IVec, end: IVec, width: number, color: number, activate: boolean, change: boolean) {
        this.entityId = entityId;
        this.start = start;
        this.end = end;
        this.width = width;
        this.color = color;
        this.activate = activate;
        this.change = change;
    }

    abstract getId(): PayloadId<LaserWeaponS2CPacket>;
}

export class LaserWeaponActivate extends LaserWeaponS2CPacket {
    public static readonly ID: PayloadId<LaserWeaponActivate> = payloadId('laser_activate');
    public static readonly CODEC: PacketCodec<LaserWeaponActivate> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.entityId);
            PacketCodecs.VECTOR2F.encode(writer, value.start);
            PacketCodecs.VECTOR2F.encode(writer, value.end);
            writer.writeVarUint(value.width);
            writer.writeUint32(value.color);
        },
        reader => {
            return new LaserWeaponActivate(
                reader.readVarUint(),
                PacketCodecs.VECTOR2F.decode(reader),
                PacketCodecs.VECTOR2F.decode(reader),
                reader.readVarUint(),
                reader.readUint32(),
            );
        }
    );

    public constructor(entityId: number, start: IVec, end: IVec, width: number, color: number) {
        super(entityId, start, end, width, color, true, false);
    }

    public getId(): PayloadId<LaserWeaponActivate> {
        return LaserWeaponActivate.ID;
    }
}

export class LaserWeaponDeactivate extends LaserWeaponS2CPacket {
    public static readonly ID: PayloadId<LaserWeaponDeactivate> = payloadId('laser_deactivate');
    public static readonly CODEC: PacketCodec<LaserWeaponDeactivate> = PacketCodecs.adapt(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        val => new LaserWeaponDeactivate(val)
    );

    public constructor(entityId: number) {
        super(entityId, Vec2.ZERO, Vec2.ZERO, 0, 0, false, false);
    }

    public getId(): PayloadId<LaserWeaponDeactivate> {
        return LaserWeaponDeactivate.ID;
    }
}

export class LaserWeaponChange extends LaserWeaponS2CPacket {
    public static readonly ID: PayloadId<LaserWeaponChange> = payloadId('laser_change');
    public static readonly CODEC: PacketCodec<LaserWeaponChange> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.entityId);
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

    public constructor(entityId: number, start: IVec, end: IVec) {
        super(entityId, start, end, 0, 0, false, true);
    }

    public getId(): PayloadId<LaserWeaponChange> {
        return LaserWeaponChange.ID;
    }
}