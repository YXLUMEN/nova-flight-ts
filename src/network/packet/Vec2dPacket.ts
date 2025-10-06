import type {Payload, PayloadId} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {PacketCodec} from "../codec/PacketCodec.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export class Vec2dPacket implements Payload {
    public static readonly ID: PayloadId<Vec2dPacket> = {id: Identifier.ofVanilla('vec2')};

    public static readonly CODEC: PacketCodec<Vec2dPacket> = PacketCodec.of<Vec2dPacket>(
        (value, writer) => {
            writer.writeDouble(value.value.x);
            writer.writeDouble(value.value.y);
        },
        (reader) => {
            const x = reader.readDouble();
            const y = reader.readDouble();
            return new Vec2dPacket(new Vec2(x, y));
        }
    );

    public readonly value: IVec;

    public constructor(value: IVec) {
        this.value = value;
    }

    public getId(): PayloadId<Vec2dPacket> {
        return Vec2dPacket.ID;
    }
}