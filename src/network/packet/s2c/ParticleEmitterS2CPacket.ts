import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";
import {ParticleEffectType} from "../../../effect/particle/ParticleEffectType.ts";

export abstract class ParticleEmitterS2CPacket implements Payload {
    public readonly particle: ParticleEffectType;
    public readonly entityId: number;
    public readonly x: number;
    public readonly y: number;
    public readonly lifeTick: number;

    public readonly forEntity: boolean;

    protected constructor(
        particle: ParticleEffectType,
        x: number, y: number,
        lifeTick: number = 3,
        entityId: number,
        forEntity: boolean,
    ) {
        this.particle = particle;
        this.x = x;
        this.y = y;
        this.lifeTick = lifeTick;
        this.entityId = entityId;
        this.forEntity = forEntity;
    }

    public abstract type(): PayloadType<ParticleEmitterS2CPacket>;

    public accept(listener: ClientPlayHandler): void {
        listener.onParticleEmitter(this);
    }
}

export class EntityEmitter extends ParticleEmitterS2CPacket {
    public static readonly ID: PayloadType<EntityEmitter> = payloadType('entity_emitter');
    public static readonly CODEC: PacketCodec<EntityEmitter> = PacketCodecs.of(
        (writer, value) => {
            ParticleEffectType.PACKET_CODEC.encode(writer, value.particle);
            writer.writeVarUint(value.entityId);
            writer.writeVarUint(value.lifeTick);
        },
        reader => new EntityEmitter(
            ParticleEffectType.PACKET_CODEC.decode(reader),
            reader.readVarUint(),
            reader.readVarUint(),
        )
    );

    public constructor(particle: ParticleEffectType, entityId: number, lifeTick?: number) {
        super(particle, 0, 0, lifeTick, entityId, true);
    }

    public type(): PayloadType<EntityEmitter> {
        return EntityEmitter.ID;
    }
}

export class PosEmitter extends ParticleEmitterS2CPacket {
    public static readonly ID: PayloadType<PosEmitter> = payloadType('entity_emitter');
    public static readonly CODEC: PacketCodec<PosEmitter> = PacketCodecs.of(
        (writer, value) => {
            ParticleEffectType.PACKET_CODEC.encode(writer, value.particle);
            writer.writeDouble(value.x);
            writer.writeDouble(value.y);
            writer.writeVarUint(value.lifeTick);
        },
        reader => new PosEmitter(
            ParticleEffectType.PACKET_CODEC.decode(reader),
            reader.readDouble(),
            reader.readDouble(),
            reader.readVarUint(),
        )
    );

    public constructor(particle: ParticleEffectType, x: number, y: number, lifeTick?: number) {
        super(particle, x, y, lifeTick, 0, false);
    }

    public type(): PayloadType<PosEmitter> {
        return PosEmitter.ID;
    }
}