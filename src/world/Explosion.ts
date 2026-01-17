import type {ExplosionOpts} from "../apis/IExplosionOpts.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {PI2, rand, squareDist} from "../utils/math/math.ts";
import type {ClientWorld} from "../client/ClientWorld.ts";
import type {World} from "./World.ts";
import type {Entity} from "../entity/Entity.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";

export class Explosion {
    private readonly world: World;
    private readonly x: number;
    private readonly y: number;

    private readonly source: Entity | null;
    private readonly damageSource: DamageSource;
    private readonly opts: ExplosionOpts;

    public constructor(
        world: World,
        x: number,
        y: number,
        source: Entity | null,
        damageSource: DamageSource | null,
        opts: ExplosionOpts
    ) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.source = source;
        this.damageSource = damageSource === null ? world.getDamageSources().explosionInstance(this) : damageSource;
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
        const halfR2 = this.opts.behaviour === 'fusion' ? Math.floor(radius / 2) ** 2 : 0;

        const attacker = this.damageSource.getAttacker();

        if (attacker instanceof MobEntity) {
            for (const player of world.getPlayers()) {
                const dist = squareDist(player.getX(), player.getY(), this.x, this.y);
                if (dist <= r2) player.takeDamage(this.damageSource, damage);
            }
            return;
        }

        for (const mob of world.getMobs()) {
            if (mob.isRemoved()) continue;

            const dist = squareDist(mob.getX(), mob.getY(), this.x, this.y);
            if (dist > r2) continue;

            mob.takeDamage(this.damageSource, damage);

            if (this.opts.behaviour === 'fusion' && dist <= halfR2) {
                this.fusion(mob, damage);
            }

            if (this.opts.statusEffect) {
                const {effect, duration, amplifier} = this.opts.statusEffect;
                mob.addStatusEffect(new StatusEffectInstance(effect, duration, amplifier), this.source);
            }
        }

        // 客户端没有这个字段
        if (this.opts.behaviour === 'fusion') {
            const r = Math.floor(radius / 2);
            import('../effect/RadialRing.ts')
                .then(mod => (world as ServerWorld).spawnEffect(null, new mod.RadialRing(
                    new Vec2(this.x, this.y),
                    r * 0.1, r * 1.1,
                    0.8, '#e13600'
                )));
        }

        if (this.opts.playSound === false) return;
        world.playSound(null, SoundEvents.EXPLOSION, 0.5);
    }

    private fusion(entity: LivingEntity, damage: number) {
        const final = damage + (entity.getHealth() * 0.3) | 0;
        entity.takeDamage(this.damageSource, final);
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

        import('../effect/RadialRing.ts')
            .then(mod => world.addEffect(null, new mod.RadialRing(
                new Vec2(this.x, this.y),
                radius * 0.2, radius * 1.1,
                0.35, color
            )));
    }

    public getX() {
        return this.x;
    }

    public getY() {
        return this.y;
    }

    public getSource(): Entity | null {
        return this.source;
    }

    public getCausingEntity(): Entity | null {
        return Explosion.getCausingEntity(this.source);
    }

    public getDamageSource() {
        return this.damageSource;
    }

    public getOpts() {
        return this.opts;
    }

    private static getCausingEntity(from: Entity | null): Entity | null {
        if (from === null) {
            return null;
        }

        if (from instanceof LivingEntity) {
            return from;
        }

        if (from instanceof ProjectileEntity) {
            return from.getOwner();
        }
        return null;
    }
}