import type {Entity} from "../../entity/Entity.ts";
import type {ParticleEffectType} from "./ParticleEffectType.ts";
import type {HexColor} from "../../type/types.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import type {ClientWorld} from "../../client/ClientWorld.ts";
import type {ParticleSystem} from "./ParticleSystem.ts";
import {rand, randInt} from "../../utils/math/math.ts";
import {encodeColorHex} from "../../utils/net_util.ts";
import {ParticlePool} from "./ParticlePool.ts";
import {ParticleShape} from "./ParticleShape.ts";
import {ParticleEmitter} from "./ParticleEmitter.ts";

export class ParticleEngine {
    private readonly pool: ParticlePool;
    private readonly emitters: ParticleEmitter[] = [];

    private world: ClientWorld | null = null;

    public constructor(capacity?: number) {
        this.pool = new ParticlePool(capacity);
    }

    public createEmitterAtEntity(entity: Entity, particle: ParticleEffectType, life?: number): void {
        this.emitters.push(new ParticleEmitter(this.world!, entity.getX(), entity.getY(), particle, life));
    }

    public createEmitterByVec(vec: Vec2, particle: ParticleEffectType, life?: number): void {
        this.emitters.push(new ParticleEmitter(this.world!, vec.x, vec.y, particle, life));
    }

    public createEmitter(x: number, y: number, particle: ParticleEffectType, life?: number): void {
        this.emitters.push(new ParticleEmitter(this.world!, x, y, particle, life));
    }

    public spawn(
        type: ParticleEffectType,
        x: number, y: number,
        count: number,
        baseAngle: number = 0,
    ): void {
        const pool = this.pool;
        const max = Math.min(count, pool.availableCap());
        if (max <= 0) return;

        const shape = type.shape;
        const rotatable = shape !== ParticleShape.CIRCLE;
        const traitCount = type.traits === null ? 0 : type.traits.length;

        for (let k = 0; k < max; k++) {
            const speed = rand(type.speedMin, type.speedMax);
            const angle = baseAngle + rand(type.spreadMin, type.spreadMax);

            const i = pool.spawnResolve(
                x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                randInt(type.lifeMin, type.lifeMax),
                rand(type.sizeMin, type.sizeMax),
                shape,
                type.colorFrom, type.colorTo,
                type.acc,
                type.recession,
                rotatable ? rand(type.rotMin, type.rotMax) : 0,
            );
            if (i < 0) continue;

            for (let t = 0; t < traitCount; t++) {
                const trait = type.traits![t];
                pool.attach(i, trait.attr, trait.value);
            }
        }
    }

    public spawnRaw(
        x: number, y: number,
        vx: number, vy: number,
        life: number,
        size: number,
        shape: ParticleShape = ParticleShape.CIRCLE,
        colorFrom: HexColor, colorTo: HexColor = colorFrom,
        acc?: number,
        recession?: number,
        rot?: number,
    ): number {
        return this.pool.spawnResolve(
            x, y,
            vx, vy,
            life,
            size,
            shape,
            encodeColorHex(colorFrom), encodeColorHex(colorTo),
            acc, recession, rot
        );
    }

    public tick(dt: number): void {
        this.pool.tick(dt);

        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const emitter = this.emitters[i];
            emitter.tick();
            if (emitter.isAlive()) continue;
            this.emitters[i] = this.emitters[this.emitters.length - 1];
            this.emitters.pop();
        }
    }

    public render(ctx: CanvasRenderingContext2D, alpha: number): void {
        this.pool.render(ctx, alpha);
    }

    public registerSystem(system: ParticleSystem): void {
        this.pool.registerSystem(system);
    }

    public unregisterSystem(system: ParticleSystem): void {
        this.pool.unregisterSystem(system);
    }

    public setWorld(world: ClientWorld | null): void {
        this.world = world;
        this.reset();
    }

    public reset(): void {
        this.pool.reset();
        this.emitters.length = 0;
    }

    public clearCache(): void {
        this.pool.clearCache();
    }
}