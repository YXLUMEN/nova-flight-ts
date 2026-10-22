import type {ParticleAttr} from "./ParticleAttr.ts";

/** 外挂列: 同容量 Float32Array + 它在 meta 里占的那一位 */
export interface RareColumn {
    readonly attr: ParticleAttr;
    readonly bit: number;
    readonly data: Float32Array;
}