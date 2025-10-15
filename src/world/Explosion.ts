import type {ExpendExplosionOpts} from "../apis/IExplosionOpts.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {distance2, PI2, rand} from "../utils/math/math.ts";
import {RadialRing} from "../effect/RadialRing.ts";
import type {ClientWorld} from "../client/ClientWorld.ts";
import type {World} from "./World.ts";
import type {Entity} from "../entity/Entity.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import {Vec2} from "../utils/math/Vec2.ts";

export class Explosion {
    private readonly world: World;
    private x: number;
    private y: number;

    private readonly source: Entity | null;
    private readonly damageSource: DamageSource;
    private readonly opts: ExpendExplosionOpts;

    public constructor(world: World, x: number, y: number, source: Entity | null, damageSource: DamageSource, opts: ExpendExplosionOpts) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.source = source;
        this.damageSource = damageSource;
        this.opts = opts;
    }

    public apply() {
        if (this.world.isClient) {
            this.summonExplosionVisual(this.world as ClientWorld);
        } else {
            this.summonExplosion(this.world);
        }
    }

    public summonExplosion(world: World) {
        const radius = this.opts.explosionRadius ?? 16;
        const damage = this.opts.damage ?? 6;

        const r2 = radius * radius;

        if (this.opts.attacker instanceof MobEntity) {
            for (const player of world.getPlayers()) {
                const d2 = distance2(player.getX(), player.getY(), this.x, this.y);
                if (d2 <= r2) player.takeDamage(this.damageSource, damage);
            }
            return;
        }

        for (const mob of world.getMobs()) {
            if (mob.isRemoved()) continue;
            const d2 = distance2(mob.getX(), mob.getY(), this.x, this.y);
            if (d2 <= r2) {
                mob.takeDamage(this.damageSource, damage);
                if (this.opts.statusEffect) {
                    const {effect, duration, amplifier} = this.opts.statusEffect;
                    mob.addStatusEffect(new StatusEffectInstance(effect, duration, amplifier), this.source);
                }
            }
        }
    }

    public summonExplosionVisual(world: ClientWorld) {
        const damage = this.opts.damage ?? 0;
        const radius = this.opts.explosionRadius ?? 90;

        const defaultSparks = Math.max(8, Math.floor(damage * 0.8));
        const defaultFastSparks = Math.max(4, Math.floor(damage * 0.2));
        const sparks = this.opts.sparks ?? defaultSparks;
        const fastSparks = this.opts.fastSparks ?? defaultFastSparks;

        const important = this.opts.important ?? false;
        const color = this.opts.explodeColor ?? '#e3e3e3';

        for (let i = 0; i < sparks; i++) {
            const a = rand(0, PI2);
            const speed = rand(120, 360);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);
            const ePos = new MutVec2(this.x, this.y);

            if (important) {
                world.addImportantParticle(ePos.x, ePos.y, vel.x, vel.y,
                    rand(0.25, 0.6), rand(3, 8),
                    "#ffd966", "rgba(255,69,0,0)")
            } else {
                world.addParticleByVec(
                    ePos, vel, rand(0.25, 0.6), rand(3, 8),
                    "#ffd966", "rgba(255,69,0,0)");
            }
        }

        for (let i = 0; i < fastSparks; i++) {
            const a = rand(0, PI2);
            const speed = rand(80, 180);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);
            const ePos = new MutVec2(this.x, this.y);

            if (important) {
                world.addImportantParticle(ePos.x, ePos.y, vel.x, vel.y,
                    rand(0.6, 1.2), rand(4, 10),
                    "#ffaa33", "rgba(255,140,0,0)", 0.6, 80
                );
            } else {
                world.addParticleByVec(
                    ePos, vel, rand(0.6, 1.2), rand(4, 10),
                    "#ffaa33", "rgba(255,140,0,0)", 0.6, 80
                );
            }
        }

        world.addEffect(new RadialRing(new Vec2(this.x, this.y), radius * 0.2, radius * 1.1, 0.35, color));
    }

    public setPos(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}