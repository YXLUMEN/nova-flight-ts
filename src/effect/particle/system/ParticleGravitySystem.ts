import type {ParticleSystem} from "../ParticleSystem.ts";
import type {ParticleStore} from "../ParticleStore.ts";
import {attrBit, P_IDX, ParticleAttr, ROW_SLOTS} from "../ParticleAttr.ts";

export class ParticleGravitySystem implements ParticleSystem {
    public readonly bit: number = attrBit(ParticleAttr.GRAVITY);

    private readonly ax: number;
    private readonly ay: number;

    public constructor(ax: number, ay: number) {
        this.ax = ax;
        this.ay = ay;
    }

    public tick(store: ParticleStore): void {
        const bit = this.bit;
        const f = store.f32;
        const meta = store.meta;
        const dvx = this.ax;
        const dvy = this.ay;

        for (let i = store.active - 1; i >= 0; i--) {
            if ((meta[i] & bit) === 0) continue;

            const b = i * ROW_SLOTS;
            f[b + P_IDX.VX] = f[b + P_IDX.VX] + dvx;
            f[b + P_IDX.VY] = f[b + P_IDX.VY] + dvy;
        }
    }
}