import {Weapon} from "./Weapon.ts";
import {World} from "../World.ts";
import {Vec2} from "../math/Vec2.ts";
import {Particle} from "../effect/Particle.ts";
import {RadialRing} from "../effect/RadialRing.ts";
import {rand} from "../math/math.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ExplosionOpts} from "../apis/IExplosionOpts.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";


export class BombWeapon extends Weapon implements ISpecialWeapon{
    public damageRadius = 200;

    constructor(owner: Entity) {
        super(owner, 24, 16);
    }

    public override tryFire(world: World) {
        if (this.getCooldown() > 0) return;

        const center = this.owner.pos.clone();
        BombWeapon.applyBombDamage(world, center, this.damageRadius, this.getDamage());
        world.events.emit('bomb-detonate', {
            pos: center,
            visionRadius: this.damageRadius,
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

    public static applyBombDamage(world: World, center: Vec2, radius: number, damage: number) {
        const r2 = radius * radius;
        for (const mob of world.mobs) {
            if (mob.isDead) continue;
            const d2 = Vec2.distSq(mob.pos, center);
            if (d2 <= r2) {
                mob.onDamage(world, damage);
                if (mob.isDead) world.events.emit('mob-killed', mob);
            }
        }
    }

    public static spawnExplosionVisual(world: World, pos: Vec2, opts: ExplosionOpts = {}) {
        const radius = opts.visionRadius ?? 90;
        const sparks = opts.sparks ?? 26;
        const fastSparks = opts.fastSparks ?? 10;

        for (let i = 0; i < sparks; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(120, 360);
            const vel = new Vec2(Math.cos(a) * speed, Math.sin(a) * speed);
            world.addEffect(new Particle(
                pos.clone(), vel, rand(0.25, 0.6), rand(3, 8),
                "#ffd966", "rgba(255,69,0,0)"
            ));
        }

        for (let i = 0; i < fastSparks; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(80, 180);
            const vel = new Vec2(Math.cos(a) * speed, Math.sin(a) * speed);
            world.addEffect(new Particle(
                pos.clone(), vel, rand(0.6, 1.2), rand(4, 10),
                "#ffaa33", "rgba(255,140,0,0)", 0.6, 80
            ));
        }

        world.addEffect(new RadialRing(pos.clone(), radius * 0.2, radius * 1.1, 0.35, "#e3e3e3"));
    }
}