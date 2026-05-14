import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ParticleEffectType} from "../../../effect/ParticleEffectType.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class PreparedParticleS2CPacket implements Payload {
    public static readonly ID: PayloadType<PreparedParticleS2CPacket> = payloadType('prepared_particle');
    public static readonly CODEC: PacketCodec<PreparedParticleS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            ParticleEffectType.PACKET_CODEC.encode(writer, value.particle);
            PacketCodecs.VECTOR2F.encode(writer, value.pos);
            writer.writeVarUint(value.count);
            writer.writeFloat(value.baseAngle);
        },
        reader => {
            return new PreparedParticleS2CPacket(
                ParticleEffectType.PACKET_CODEC.decode(reader),
                PacketCodecs.VECTOR2F.decode(reader),
                reader.readVarUint(),
                reader.readFloat(),
            );
        }
    );

    public readonly particle: ParticleEffectType;
    public readonly pos: Vec2;
    public readonly count: number;
    public readonly baseAngle: number;

    public constructor(particle: ParticleEffectType, pos: Vec2, count: number, baseAngle: number = 0) {
        this.particle = particle;
        this.pos = pos;
        this.count = count;
        this.baseAngle = baseAngle;
    }

    public type(): PayloadType<PreparedParticleS2CPacket> {
        return PreparedParticleS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onPreparedParticle(this);
    }

    public estimateSize(): number {
        return 20;
    }
}