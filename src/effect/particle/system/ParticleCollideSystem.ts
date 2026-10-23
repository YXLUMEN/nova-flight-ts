import type {ParticleSystem} from "../ParticleSystem.ts";
import {attrBit, P_IDX, ParticleAttr, ROW_SLOTS} from "../ParticleAttr.ts";
import type {ParticleStore} from "../ParticleStore.ts";
import type {ClientWorld} from "../../../client/ClientWorld.ts";

export class ParticleCollideSystem implements ParticleSystem {
    public readonly bit: number = attrBit(ParticleAttr.COLLIDE);

    private readonly world: ClientWorld;

    public constructor(world: ClientWorld) {
        this.world = world;
    }

    public tick(store: ParticleStore): void {
        const bit = this.bit;
        const f32 = store.f32;
        const meta = store.meta;
        const map = this.world.getMap();

        // 粗略碰撞
        for (let i = store.active - 1; i >= 0; i--) {
            if ((meta[i] & bit) === 0) continue;

            const b = i * ROW_SLOTS;
            const x = f32[b + P_IDX.CX];
            const y = f32[b + P_IDX.CY];

            if (!map.isObstacleAtPixel(x, y)) continue;

            f32[b + P_IDX.VX] = 0;
            f32[b + P_IDX.VY] = 0;
        }
    }
}