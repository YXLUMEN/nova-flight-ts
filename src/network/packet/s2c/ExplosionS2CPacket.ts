import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ExplosionBehavior} from "../../../world/element/explosion/ExplosionBehavior.ts";
import {ExplosionVisual} from "../../../world/element/explosion/ExplosionVisual.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class ExplosionS2CPacket implements Payload {
    public static readonly ID: PayloadType<ExplosionS2CPacket> = payloadType('explosion');
    public static readonly CODEC: PacketCodec<ExplosionS2CPacket> = PacketCodecs.of<ExplosionS2CPacket>(
        (writer, value) => {
            writer.writeFloat(value.x);
            writer.writeFloat(value.y);
            writer.writeFloat(value.power);
            ExplosionBehavior.CODEC.encode(writer, value.behaviour);
            ExplosionVisual.CODEC.encode(writer, value.visual);
        },
        (reader) => {
            return new ExplosionS2CPacket(
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat(),
                ExplosionBehavior.CODEC.decode(reader),
                ExplosionVisual.CODEC.decode(reader)
            );
        }
    );

    public readonly x: number;
    public readonly y: number;
    public readonly power: number;
    public readonly behaviour: ExplosionBehavior;
    public readonly visual: ExplosionVisual;

    public constructor(x: number, y: number, power: number, behaviour: ExplosionBehavior | null, visual: ExplosionVisual | null) {
        this.x = x;
        this.y = y;
        this.power = power;
        this.behaviour = behaviour ?? new ExplosionBehavior();
        this.visual = visual ?? new ExplosionVisual();
    }

    public type(): PayloadType<ExplosionS2CPacket> {
        return ExplosionS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onExplosion(this);
    }
}