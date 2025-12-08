import type {Payload, PayloadId} from "../../Payload.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {decodeYaw, encodeYaw} from "../../../utils/NetUtil.ts";

export abstract class EntityS2CPacket implements Payload {
    public readonly entityId: number;
    public readonly deltaX: number;
    public readonly deltaY: number;
    private readonly yawByte: number;
    public readonly rotate: boolean;
    public readonly positionChanged: boolean;

    protected constructor(entityId: number, deltaX: number, deltaY: number, yaw: number, rotate: boolean, positionChanged: boolean) {
        this.entityId = entityId;
        this.deltaX = deltaX;
        this.deltaY = deltaY;
        this.yawByte = encodeYaw(yaw);
        this.rotate = rotate;
        this.positionChanged = positionChanged;
    }

    abstract getId(): PayloadId<any>;

    public get yaw() {
        return decodeYaw(this.yawByte);
    }
}

export class MoveRelative extends EntityS2CPacket {
    public static readonly ID: PayloadId<EntityS2CPacket> = {id: Identifier.ofVanilla('entity_move_pos')};
    public static readonly CODEC = PacketCodecs.of(this.write, this.read);

    public constructor(entityId: number, deltaX: number, deltaY: number) {
        super(entityId, deltaX, deltaY, 0, false, true);
    }

    private static write(writer: BinaryWriter, value: EntityS2CPacket): void {
        writer.writeVarUint(value.entityId);
        writer.writeInt16(value.deltaX);
        writer.writeInt16(value.deltaY);
    }

    private static read(reader: BinaryReader): MoveRelative {
        return new MoveRelative(
            reader.readVarUint(),
            reader.readInt16(),
            reader.readInt16()
        )
    }

    public getId(): PayloadId<any> {
        return MoveRelative.ID;
    }
}

export class Rotate extends EntityS2CPacket {
    public static readonly ID: PayloadId<Rotate> = {id: Identifier.ofVanilla('entity_move_rotate')};
    public static readonly CODEC = PacketCodecs.of(this.write, this.read);

    public constructor(entityId: number, yaw: number) {
        super(entityId, 0, 0, yaw, true, false);
    }

    private static write(writer: BinaryWriter, value: EntityS2CPacket,): void {
        writer.writeVarUint(value.entityId);
        writer.writeInt8(value.yaw);
    }

    private static read(reader: BinaryReader): Rotate {
        return new Rotate(
            reader.readVarUint(),
            reader.readUint8()
        )
    }

    public getId(): PayloadId<any> {
        return Rotate.ID;
    }
}

export class RotateAndMoveRelative extends EntityS2CPacket {
    public static readonly ID: PayloadId<Rotate> = {id: Identifier.ofVanilla('entity_move_pos_rotate')};
    public static readonly CODEC = PacketCodecs.of(this.write, this.read);

    public constructor(entityId: number, deltaX: number, deltaY: number, yaw: number) {
        super(entityId, deltaX, deltaY, yaw, true, true);
    }

    private static write(writer: BinaryWriter, value: EntityS2CPacket): void {
        writer.writeVarUint(value.entityId);
        writer.writeInt16(value.deltaX);
        writer.writeInt16(value.deltaY);
        writer.writeInt8(value.yaw);
    }

    private static read(reader: BinaryReader): RotateAndMoveRelative {
        return new RotateAndMoveRelative(
            reader.readVarUint(),
            reader.readInt16(),
            reader.readInt16(),
            reader.readInt8()
        )
    }

    public getId(): PayloadId<any> {
        return RotateAndMoveRelative.ID;
    }
}