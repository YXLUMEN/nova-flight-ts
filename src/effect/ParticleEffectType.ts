import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Registries} from "../registry/Registries.ts";

/**
 * Describes a named particle effect preset.
 * Stores randomized spawn parameters (ranges) for convenient bulk emission.
 */
export class ParticleEffectType {
    public static readonly PACKET_CODEC: PacketCodec<ParticleEffectType> = PacketCodecs.registryValue(Registries.PARTICLES);

    /** Minimum particle lifetime (seconds). */
    public readonly lifeMin: number;
    /** Maximum particle lifetime (seconds). */
    public readonly lifeMax: number;

    /** Minimum spawn radius size. */
    public readonly sizeMin: number;
    /** Maximum spawn radius size. */
    public readonly sizeMax: number;

    /** Start color (CSS hex/rgba) at t=0. */
    public readonly colorFrom: string;
    /** End color (CSS hex/rgba) at t=life. */
    public readonly colorTo: string;

    /** Minimum emission speed (units/s). */
    public readonly speedMin: number;
    /** Maximum emission speed (units/s). */
    public readonly speedMax: number;

    /** Minimum spread half-angle (radians, 0 = directional). */
    public readonly spreadMin: number;
    /** Maximum spread half-angle (radians, Math.PI = omnidirectional). */
    public readonly spreadMax: number;

    /** Velocity drag coefficient (0 = no drag). */
    public readonly drag: number;

    /** Gravity acceleration (units/s²). */
    public readonly gravity: number;

    /** @internal */
    public constructor(builder: ParticleEffectTypeBuilder) {
        this.lifeMin = builder.lifeMin;
        this.lifeMax = builder.lifeMax;
        this.sizeMin = builder.sizeMin;
        this.sizeMax = builder.sizeMax;
        this.colorFrom = builder.colorFrom;
        this.colorTo = builder.colorTo;
        this.speedMin = builder.speedMin;
        this.speedMax = builder.speedMax;
        this.spreadMin = builder.spreadMin;
        this.spreadMax = builder.spreadMax;
        this.drag = builder.drag;
        this.gravity = builder.gravity;
    }

    /** Start building a new ParticleEffectType. */
    public static builder(): ParticleEffectTypeBuilder {
        return new ParticleEffectTypeBuilder();
    }
}

export class ParticleEffectTypeBuilder {
    public lifeMin: number = 0.3;
    public lifeMax: number = 0.8;

    public sizeMin: number = 2;
    public sizeMax: number = 5;

    public colorFrom: string = '#ffffff';
    public colorTo: string = 'rgba(255,255,255,0)';

    public speedMin: number = 60;
    public speedMax: number = 160;

    public spreadMin: number = 0;
    public spreadMax: number = Math.PI;

    public drag: number = 0.5;
    public gravity: number = 0;

    public life(min: number, max: number): this {
        this.lifeMin = min;
        this.lifeMax = max;
        return this;
    }

    public size(min: number, max: number): this {
        this.sizeMin = min;
        this.sizeMax = max;
        return this;
    }

    public colors(from: string, to?: string): this {
        this.colorFrom = from;
        this.colorTo = to ?? from;
        return this;
    }

    public speed(min: number, max: number): this {
        this.speedMin = min;
        this.speedMax = max;
        return this;
    }

    /** Emit in all directions (full circle). */
    public omnidirectional(): this {
        this.spreadMin = 0;
        this.spreadMax = Math.PI;
        return this;
    }

    /** Emit within ±halfAngle around the base direction. */
    public spread(halfAngle: number): this {
        this.spreadMin = 0;
        this.spreadMax = halfAngle;
        return this;
    }

    public withDrag(drag: number): this {
        this.drag = drag;
        return this;
    }

    public withGravity(gravity: number): this {
        this.gravity = gravity;
        return this;
    }

    public build(): ParticleEffectType {
        return new ParticleEffectType(this);
    }
}
