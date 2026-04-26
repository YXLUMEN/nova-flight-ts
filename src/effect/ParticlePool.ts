import {Particle} from "./Particle.ts";
import type {ParticleEffectType} from "./ParticleEffectType.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {rand} from "../utils/math/math.ts";
import type {Vec2} from "../utils/math/Vec2.ts";

export class ParticlePool {
    private readonly active: Particle[] = [];
    private readonly pool: Particle[] = [];

    private readonly capacity: number;

    private readonly tmpVel = MutVec2.zero();

    public constructor(capacity: number = 1000) {
        this.capacity = capacity;
    }

    public spawn(
        pos: Vec2, vel: Vec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0
    ): Particle {
        let p: Particle;
        if (this.pool.length > 0) {
            p = this.pool.pop()!;
            p.reset(pos, vel, life, size, colorFrom, colorTo, drag);
        } else if (this.active.length < this.capacity) {
            p = new Particle(pos, vel, life, size, colorFrom, colorTo, drag);
        } else {
            p = this.active.shift()!;
            p.reset(pos, vel, life, size, colorFrom, colorTo, drag);
        }
        this.active.push(p);
        return p;
    }

    public spawnEffect(
        type: ParticleEffectType,
        pos: Vec2,
        count: number,
        baseAngle: number = 0
    ): void {
        const v = this.tmpVel;

        for (let i = 0; i < count; i++) {
            const speed = rand(type.speedMin, type.speedMax);
            const spread = rand(type.spreadMin, type.spreadMax);
            const sign = Math.random() < 0.5 ? 1 : -1;
            const angle = baseAngle + sign * spread;
            v.set(Math.cos(angle) * speed, Math.sin(angle) * speed);

            this.spawn(
                pos, v,
                rand(type.lifeMin, type.lifeMax),
                rand(type.sizeMin, type.sizeMax),
                type.colorFrom, type.colorTo,
                type.drag
            );
        }
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
        const len = this.active.length;
        for (let i = 0; i < len; i++) {
            this.active[i].render(ctx, tickDelta);
        }
    }

    public get activeCount(): number {
        return this.active.length;
    }

    public get pooledCount(): number {
        return this.pool.length;
    }
}
