import {Weapon} from "./Weapon.ts";
import {World} from "../world/World.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {RadialRing} from "../effect/RadialRing.ts";
import {rand} from "../utils/math/math.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ExplosionOpts} from "../apis/IExplosionOpts.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import {Particle} from "../effect/Particle.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {EVENTS} from "../apis/IEvents.ts";


export class BombWeapon extends Weapon implements ISpecialWeapon {
    public damageRadius = 200;

    constructor(owner: LivingEntity) {
        super(owner, 24, 800);
    }

    public static applyBombDamage(
        world: World, center: IVec, radius: number,
        damage: number,
        source: Entity | null = null, attacker: LivingEntity | null = null) {
        const r2 = radius * radius;
        for (const mob of world.getLoadMobs()) {
            if (mob.isRemoved()) continue;
            const d2 = MutVec2.distSq(mob.getMutPosition, center);
            if (d2 <= r2) {
                mob.takeDamage(world.getDamageSources().explosion(source, attacker), damage);
            }
        }
    }

    public static spawnExplosionVisual(world: World, pos: IVec, opts: ExplosionOpts = {}) {
        const radius = opts.explosionRadius ?? 90;
        const sparks = opts.sparks ?? 26;
        const fastSparks = opts.fastSparks ?? 10;
        const important = opts.important ?? false;

        for (let i = 0; i < sparks; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(120, 360);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);
            const ePos = new MutVec2(pos.x, pos.y);

            if (important) world.addEffect(new Particle(ePos, vel.clone(),
                rand(0.25, 0.6), rand(3, 8),
                "#ffd966", "rgba(255,69,0,0)"
            )); else world.spawnParticle(
                ePos, vel, rand(0.25, 0.6), rand(3, 8),
                "#ffd966", "rgba(255,69,0,0)");
        }

        for (let i = 0; i < fastSparks; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(80, 180);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);
            const ePos = new MutVec2(pos.x, pos.y);

            if (important) world.addEffect(new Particle(
                ePos, vel.clone(), rand(0.6, 1.2), rand(4, 10),
                "#ffaa33", "rgba(255,140,0,0)", 0.6, 80
            )); else world.spawnParticle(
                ePos, vel, rand(0.6, 1.2), rand(4, 10),
                "#ffaa33", "rgba(255,140,0,0)", 0.6, 80
            );
        }

        world.addEffect(new RadialRing(pos, radius * 0.2, radius * 1.1, 0.35, "#e3e3e3"));
    }

    public override tryFire(world: World) {
        world.events.emit(EVENTS.BOMB_DETONATE, {
            pos: this.owner.getPosition(),
            damage: this.getDamage(),
            explosionRadius: this.damageRadius,
            shake: 0.3,
            source: this.owner,
            attacker: this.owner,
        });

        this.setCooldown(this.getMaxCooldown());
    }

    public bindKey(): string {
        return 'Digit1';
    }

    public override getDisplayName(): string {
        return '炸弹';
    }

    public override getUiColor(): string {
        return '#ff9f43';
    }
}