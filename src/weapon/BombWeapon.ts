import {Weapon} from "./Weapon.ts";
import {World} from "../World.ts";
import {MutVec2} from "../math/MutVec2.ts";
import {RadialRing} from "../effect/RadialRing.ts";
import {rand} from "../math/math.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ExplosionOpts} from "../apis/IExplosionOpts.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import {Particle} from "../effect/Particle.ts";


export class BombWeapon extends Weapon implements ISpecialWeapon {
    public damageRadius = 200;

    constructor(owner: Entity) {
        super(owner, 24, 16);
    }

    public override tryFire(world: World) {
        world.events.emit('bomb-detonate', {
            pos: this.owner.getPos(),
            damage: this.getDamage(),
            explosionRadius: this.damageRadius,
            shake: 0.3
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

    public static applyBombDamage(world: World, center: MutVec2, radius: number, damage: number) {
        const r2 = radius * radius;
        for (const mob of world.mobs) {
            if (mob.isDead()) continue;
            const d2 = MutVec2.distSq(mob.pos, center);
            if (d2 <= r2) {
                mob.takeDamage(world.getDamageSources().explosion(null, null), damage);
            }
        }
    }

    public static spawnExplosionVisual(world: World, pos: MutVec2, opts: ExplosionOpts = {}) {
        const radius = opts.explosionRadius ?? 90;
        const sparks = opts.sparks ?? 26;
        const fastSparks = opts.fastSparks ?? 10;
        const important = opts.important ?? false;

        for (let i = 0; i < sparks; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(120, 360);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);

            if (important) world.addEffect(new Particle(pos.clone(), vel.clone(),
                rand(0.25, 0.6), rand(3, 8),
                "#ffd966", "rgba(255,69,0,0)"
            )); else world.spawnParticle(
                pos, vel, rand(0.25, 0.6), rand(3, 8),
                "#ffd966", "rgba(255,69,0,0)");
        }

        for (let i = 0; i < fastSparks; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(80, 180);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);

            if (important) world.addEffect(new Particle(
                pos.clone(), vel.clone(), rand(0.6, 1.2), rand(4, 10),
                "#ffaa33", "rgba(255,140,0,0)", 0.6, 80
            )); else world.spawnParticle(
                pos, vel, rand(0.6, 1.2), rand(4, 10),
                "#ffaa33", "rgba(255,140,0,0)", 0.6, 80
            );
        }

        world.addEffect(new RadialRing(pos, radius * 0.2, radius * 1.1, 0.35, "#e3e3e3"));
    }
}