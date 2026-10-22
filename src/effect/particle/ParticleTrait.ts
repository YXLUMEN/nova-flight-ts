import type {ParticleAttr} from "./ParticleAttr.ts";

export interface ParticleTrait {
    readonly attr: ParticleAttr;
    readonly value: number;
}
