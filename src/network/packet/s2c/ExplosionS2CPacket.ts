import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {decodeColorHex, decodeFromUnsignedByte} from "../../../utils/NetUtil.ts";

export class ExplosionS2CPacket implements Payload {
    public static readonly ID: PayloadId<ExplosionS2CPacket> = {id: Identifier.ofVanilla('explosion')};
    public static readonly CODEC: PacketCodec<ExplosionS2CPacket> = PacketCodecs.of<ExplosionS2CPacket>(
        (writer, value) => {
            writer.writeFloat(value.x);
            writer.writeFloat(value.y);
            writer.writeFloat(value.radius);
            writer.writeInt8(value.shackByte);
            writer.writeUint32(value.colorUint32);
        },
        (reader) => {
            return new ExplosionS2CPacket(
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat(),
                reader.readUint8(),
                reader.readUint32()
            );
        }
    );

    public readonly x: number;
    public readonly y: number;
    public readonly radius: number;
    private readonly shackByte: number;
    private readonly colorUint32: number;

    public constructor(x: number, y: number, radius: number, shackByte: number, colorUint32: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.shackByte = shackByte;
        this.colorUint32 = colorUint32;
    }

    public getId(): PayloadId<ExplosionS2CPacket> {
        return ExplosionS2CPacket.ID;
    }

    public get shack(): number {
        return decodeFromUnsignedByte(this.shackByte, 1);
    }

    public get color(): string {
        return decodeColorHex(this.colorUint32);
    }
}