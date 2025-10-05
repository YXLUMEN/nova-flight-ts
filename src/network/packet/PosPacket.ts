import type {Payload} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {PacketCodec} from "../codec/PacketCodec.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export class PosPacket implements Payload {
    public static readonly ID = Identifier.ofVanilla('position');

    public static readonly CODEC: PacketCodec<PosPacket> = PacketCodec.of<PosPacket>(
        (value, writer) => {
            writer.writeDouble(value.value.x);
            writer.writeDouble(value.value.y);
        },
        (reader) => {
            const x = reader.readDouble();
            const y = reader.readDouble();
            return new PosPacket(new Vec2(x, y));
        }
    );

    public readonly value: IVec;

    public constructor(value: IVec) {
        this.value = value;
    }

    public getId(): Identifier {
        return PosPacket.ID;
    }
}