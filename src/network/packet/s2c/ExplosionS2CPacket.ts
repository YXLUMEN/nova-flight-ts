import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";

export class ExplosionS2CPacket implements Payload {
    public static readonly ID: PayloadId<ExplosionS2CPacket> = {id: Identifier.ofVanilla('explosion')};

    public static readonly CODEC: PacketCodec<ExplosionS2CPacket> = PacketCodec.of<ExplosionS2CPacket>(
        (value, writer) => {
            writer.writeDouble(value.x);
            writer.writeDouble(value.y);
            writer.writeFloat(value.radius);
        },
        (reader) => {
            return new ExplosionS2CPacket(reader.readDouble(), reader.readDouble(), reader.readFloat());
        }
    );

    public readonly x: number;
    public readonly y: number;
    public radius: number;

    public constructor(x: number, y: number, radius: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    public getId(): PayloadId<ExplosionS2CPacket> {
        return ExplosionS2CPacket.ID;
    }
}