import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import type {HexColor} from "../../type/types.ts";
import type {ParticleEffectTypeBuilder} from "./ParticleEffectTypeBuilder.ts";
import type {ParticleTrait} from "./ParticleTrait.ts";
import {encodeColorHex} from "../../utils/net_util.ts";
import {wrapRadians} from "../../utils/math/math.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Registries} from "../../registry/Registries.ts";
import {ParticleShape} from "./ParticleShape.ts";

export class ParticleEffectType {
    public static readonly PACKET_CODEC: PacketCodec<ParticleEffectType> = PacketCodecs.registryValue(Registries.PARTICLES);

    /** Minimum particle lifetime (ticks). */
    public readonly lifeMin: number;
    /** Maximum particle lifetime (ticks). */
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

    public readonly rotMin: number = 0;
    public readonly rotMax: number = 0;

    /** Minimum spread half-angle (radians, 0 = directional). */
    public readonly spreadMin: number;
    /** Maximum spread half-angle (radians, Math.PI = omnidirectional). */
    public readonly spreadMax: number;

    /** Velocity drag coefficient (0 = no drag). */
    public readonly drag: number;

    public readonly traits: ParticleTrait[] | null;

    public constructor(builder: ParticleEffectTypeBuilderImpl) {
        this.lifeMin = builder.lifeMin;
        this.lifeMax = builder.lifeMax;
        this.recession = builder.recession_;
        this.sizeMin = builder.sizeMin;
        this.sizeMax = builder.sizeMax;
        this.shape = builder.shape_;
        this.colorFrom = encodeColorHex(builder.colorFrom);
        this.colorTo = encodeColorHex(builder.colorTo);
        this.speedMin = builder.speedMin;
        this.speedMax = builder.speedMax;
        if (this.shape !== ParticleShape.CIRCLE) {
            this.rotMin = wrapRadians(builder.rotMin);
            this.rotMax = wrapRadians(builder.rotMax);
        }

        this.spreadMin = wrapRadians(builder.spreadMin);
        this.spreadMax = wrapRadians(builder.spreadMax);
        this.drag = builder.drag_;
        this.traits = builder.traits_;
    }

    public static builder(): ParticleEffectTypeBuilder {
        return new ParticleEffectTypeBuilderImpl();
    }
}

class ParticleEffectTypeBuilderImpl implements ParticleEffectTypeBuilder {
    public lifeMin: number = 6;
    public lifeMax: number = 16;
    public recession_: number = 0.6;

    public sizeMin: number = 2;
    public sizeMax: number = 5;
    public shape_: ParticleShape = ParticleShape.CIRCLE;

    public colorFrom: HexColor = '#ffffff';
    public colorTo: HexColor = '#ffffff';

    public speedMin: number = 0;
    public speedMax: number = 0;

    public rotMin: number = 0;
    public rotMax: number = 0;

    public spreadMin: number = 0;
    public spreadMax: number = 0;

    public drag_: number = 0;
    public traits_: ParticleTrait[] | null = null;

    public life(min: number, max: number): this {
        if (min > max) throw new RangeError('max must larger than min');
        if (min < 0 || max < 0) throw new RangeError('max must larger than min');
        if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
            throw new RangeError('life must be a positive int');
        }

        this.lifeMin = min;
        this.lifeMax = max;
        return this;
    }

    public recession(value: number): this {
        this.recession_ = value;
        return this;
    }

    public size(min: number, max: number): this {
        this.sizeMin = min;
        this.sizeMax = max;
        return this;
    }

    public shape(shape: ParticleShape): this {
        this.shape_ = shape;
        return this;
    }

    public colors(from: HexColor, to?: HexColor): this {
        this.colorFrom = from;
        this.colorTo = to ?? from;
        return this;
    }

    public speed(min: number, max: number): this {
        if (min > max) throw new RangeError('max must larger than min');
        this.speedMin = min;
        this.speedMax = max;
        return this;
    }

    public rotation(rotMin: number, rotMax: number): this {
        this.rotMin = rotMin;
        this.rotMax = rotMax;
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

    public spread(min: number, max: number): this {
        this.spreadMin = min;
        this.spreadMax = max;
        return this;
    }

    public drag(drag: number): this {
        this.drag_ = drag;
        return this;
    }

    public traits(...traits: ParticleTrait[]): this {
        this.traits_ = traits;
        return this;
    }

    public build(): ParticleEffectType {
        return new ParticleEffectType(this);
    }
}