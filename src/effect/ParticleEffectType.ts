import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Registries} from "../registry/Registries.ts";
import type {HexColor} from "../type/types.ts";
import {encodeColorHex} from "../utils/NetUtil.ts";
import {ParticleShape} from "./ParticlePool.ts";

export class ParticleEffectType {
    public static readonly PACKET_CODEC: PacketCodec<ParticleEffectType> = PacketCodecs.registryValue(Registries.PARTICLES);

    /** Minimum particle lifetime (seconds). */
    public readonly lifeMin: number;
    /** Maximum particle lifetime (seconds). */
    public readonly lifeMax: number;
    public readonly recession: number;

    /** Minimum spawn radius size. */
    public readonly sizeMin: number;
    /** Maximum spawn radius size. */
    public readonly sizeMax: number;
    public readonly shape: ParticleShape;

    /** Start color (CSS hex/rgba) at t=0. */
    public readonly colorFrom: number;
    /** End color (CSS hex/rgba) at t=life. */
    public readonly colorTo: number;

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

    /** @internal */
    public constructor(builder: ParticleEffectTypeBuilder) {
        this.lifeMin = builder.lifeMin;
        this.lifeMax = builder.lifeMax;
        this.recession = builder.recession;
        this.sizeMin = builder.sizeMin;
        this.sizeMax = builder.sizeMax;
        this.shape = builder.particleShape;
        this.colorFrom = encodeColorHex(builder.colorFrom);
        this.colorTo = encodeColorHex(builder.colorTo);
        this.speedMin = builder.speedMin;
        this.speedMax = builder.speedMax;
        this.spreadMin = builder.spreadMin;
        this.spreadMax = builder.spreadMax;
        this.drag = builder.drag;
    }

    public static builder(): ParticleEffectTypeBuilder {
        return new ParticleEffectTypeBuilder();
    }
}

export class ParticleEffectTypeBuilder {
    public lifeMin: number = 0.3;
    public lifeMax: number = 0.8;
    public recession: number = 0.6;

    public sizeMin: number = 2;
    public sizeMax: number = 5;
    public particleShape: ParticleShape = ParticleShape.Circle;

    public colorFrom: HexColor = '#ffffff';
    public colorTo: HexColor = '#FFFFFF00';

    public speedMin: number = 0;
    public speedMax: number = 0;

    public spreadMin: number = 0;
    public spreadMax: number = 0;

    public drag: number = 0.5;

    public life(min: number, max: number): this {
        this.lifeMin = min;
        this.lifeMax = max;
        return this;
    }

    public setRecession(value: number): this {
        this.recession = value;
        return this;
    }

    public size(min: number, max: number): this {
        this.sizeMin = min;
        this.sizeMax = max;
        return this;
    }

    public shape(shape: ParticleShape): this {
        this.particleShape = Math.floor(shape);
        return this;
    }

    public colors(from: HexColor, to?: HexColor): this {
        this.colorFrom = from;
        this.colorTo = to ?? from;
        return this;
    }

    public speed(min: number, max: number): this {
        this.speedMin = min;
        this.speedMax = max;
        return this;
    }

    public omnidirectional(): this {
        this.spreadMin = -Math.PI;
        this.spreadMax = Math.PI;
        return this;
    }

    public symmetry(halfAngle: number): this {
        this.spreadMin = -halfAngle;
        this.spreadMax = halfAngle;
        return this;
    }

    public spread(min: number, max: number) {
        this.spreadMin = min;
        this.spreadMax = max;
        return this;
    }

    public withDrag(drag: number): this {
        this.drag = drag;
        return this;
    }

    public build(): ParticleEffectType {
        return new ParticleEffectType(this);
    }
}
