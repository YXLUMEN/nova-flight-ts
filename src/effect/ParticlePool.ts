import {Particle} from "./Particle.ts";
import type {MutVec2} from "../utils/math/MutVec2.ts";

export class ParticlePool {
    private readonly active: Particle[] = [];
    private readonly pool: Particle[] = [];

    private readonly capacity: number;

    public constructor(capacity: number = 1000) {
        this.capacity = capacity;
    }

    public spawn(
        pos: MutVec2, vel: MutVec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ): Particle {
        let p: Particle;
        if (this.pool.length > 0) {
            p = this.pool.pop()!;
            p.reset(pos, vel, life, size, colorFrom, colorTo, drag, gravity);
        } else if (this.active.length < this.capacity) {
            p = new Particle(pos, vel, life, size, colorFrom, colorTo, drag, gravity);
        } else {
            p = this.active.shift()!;
            p.reset(pos, vel, life, size, colorFrom, colorTo, drag, gravity);
        }
        this.active.push(p);
        return p;
    }

    public tick(tickDelta: number) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const p = this.active[i];
            p.tick(tickDelta);
            if (!p.alive) {
                this.active[i] = this.active[this.active.length - 1];
                this.active.pop();
                this.pool.push(p);
            }
        }
    }

    public render(ctx: CanvasRenderingContext2D, tickDelta: number) {
        for (let i = 0; i < this.active.length; i++) {
            this.active[i].render(ctx, tickDelta);
        }
    }
}
