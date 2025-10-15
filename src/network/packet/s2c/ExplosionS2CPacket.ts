import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {decodeFromUnsignedByte} from "../../../utils/NetUtil.ts";

export class ExplosionS2CPacket implements Payload {
    public static readonly ID: PayloadId<ExplosionS2CPacket> = {id: Identifier.ofVanilla('explosion')};

    public static readonly CODEC: PacketCodec<ExplosionS2CPacket> = PacketCodecs.of<ExplosionS2CPacket>(
        (writer, value) => {
            writer.writeDouble(value.x);
            writer.writeDouble(value.y);
            writer.writeFloat(value.radius);
            writer.writeByte(value.shackByte);
        },
        (reader) => {
            return new ExplosionS2CPacket(reader.readDouble(), reader.readDouble(), reader.readFloat(), reader.readUnsignByte());
        }
    );

    public readonly x: number;
    public readonly y: number;
    public readonly radius: number;
    private readonly shackByte: number;

    public constructor(x: number, y: number, radius: number, shackByte: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.shackByte = shackByte;
    }

    public getId(): PayloadId<ExplosionS2CPacket> {
        return ExplosionS2CPacket.ID;
    }

    public get shack(): number {
        return decodeFromUnsignedByte(this.shackByte, 1);
    }
}