import type {ParticleStore} from "./ParticleStore.ts";

export interface TickSystem {
    /** 门控位: 池里至少有一个粒子持有该位时才会被调度 */
    readonly bit: number;

    tick(store: ParticleStore, dt: number): void;
}

