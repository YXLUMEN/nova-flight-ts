import type {ParticleShape} from "./ParticlePool.ts";
import type {HexColor} from "../../type/types.ts";
import type {ParticleEffectType} from "./ParticleEffectType.ts";

export interface ParticleEffectTypeBuilder {
    life(min: number, max: number): this;

    recession(value: number): this;

    size(min: number, max: number): this;

    shape(shape: ParticleShape): this;

    colors(from: HexColor, to?: HexColor): this;

    speed(min: number, max: number): this;

    rotation(rotMin: number, rotMax: number): this;

    omnidirectional(): this;

    symmetry(halfAngle: number): this;

    spread(min: number, max: number): this;

    drag(drag: number): this;

    build(): ParticleEffectType;
}