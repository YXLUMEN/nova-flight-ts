import {PacketCodec} from "./PacketCodec.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export class PacketCodecs {
    public static readonly BOOL: PacketCodec<boolean> = PacketCodec.of(
        (value, writer) => writer.writeInt8(value ? 1 : 0),
        reader => reader.readInt8() !== 0
    );

    public static readonly INT8: PacketCodec<number> = PacketCodec.of(
        (value, writer) => writer.writeInt8(value),
        reader => reader.readInt8()
    );

    public static readonly INT16: PacketCodec<number> = PacketCodec.of(
        (value, writer) => writer.writeInt16(value),
        reader => reader.readInt16()
    );

    public static readonly INT32: PacketCodec<number> = PacketCodec.of(
        (value, writer) => writer.writeInt32(value),
        reader => reader.readInt32()
    );

    public static readonly UINT32: PacketCodec<number> = PacketCodec.of(
        (value, writer) => writer.writeUint32(value),
        reader => reader.readUint32()
    );

    public static readonly FLOAT: PacketCodec<number> = PacketCodec.of(
        (value, writer) => writer.writeFloat(value),
        reader => reader.readFloat()
    );

    public static readonly DOUBLE: PacketCodec<number> = PacketCodec.of(
        (value, writer) => writer.writeDouble(value),
        reader => reader.readDouble()
    );

    public static readonly STRING: PacketCodec<string> = PacketCodec.of(
        (value, writer) => writer.writeString(value),
        reader => reader.readString()
    );

    public static readonly VECTOR2D: PacketCodec<IVec> = PacketCodec.of(
        (value, writer) => {
            writer.writeDouble(value.x);
            writer.writeDouble(value.y);
        },
        reader => new Vec2(reader.readDouble(), reader.readDouble())
    );
}