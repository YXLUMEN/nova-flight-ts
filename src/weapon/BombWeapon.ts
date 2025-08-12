import {Weapon} from "./Weapon.ts";
import {Game} from "../Game.ts";
import {Vec2} from "../math/Vec2.ts";
import {Player} from "../entity/Player.ts";
import {rand} from "../math/uit.ts";
import {Particle} from "../effect/Particle.ts";
import {RadialRing} from "../effect/RadialRing.ts";

type ExplosionOpts = {
    radius?: number;        // 视觉半径
    ring?: boolean;
    smoke?: boolean;
    screenFlash?: boolean;
    shake?: number;         // 摄像机震动强度
    sparks?: number;        // 火花数量
    damage?: number;        // AoE 伤害
};

export class BombWeapon extends Weapon {
    public bombCD = 6;
    public cooldown = 0;
    public radius = 180;
    public damage = 10;

    public tryFire() {
        if (this.cooldown > 0) return;
        if (this.owner instanceof Player && !this.owner.input.isDown("1")) return;

        const center = this.owner.pos.clone();
        BombWeapon.applyBombDamage(Game.instance, center, this.radius, this.damage);
        Game.instance.events.emit('bomb-detonate', {
            pos: center,
            radius: this.radius,
            shake: 0.4
        });
        this.cooldown = this.bombCD;
    }

    public static applyBombDamage(game: Game, center: Vec2, radius: number, damage: number) {
        const r2 = radius * radius;
        for (const mob of game.mobs) {
            if (mob.isDead) continue;
            const d2 = Vec2.distSq(mob.pos, center);
            if (d2 <= r2) {
                mob.onDamage(damage);
                if (mob.isDead) game.events.emit('mob-killed', mob);
            }
        }
    }

    public static spawnExplosionVisual(game: Game, pos: Vec2, opts: ExplosionOpts = {}) {
        const radius = opts.radius ?? 90;
        const sparks = opts.sparks ?? 26;

        for (let i = 0; i < sparks; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(120, 360);
            const vel = new Vec2(Math.cos(a) * speed, Math.sin(a) * speed);
            game.effects.push(new Particle(
                pos.clone(), vel, rand(0.25, 0.6), rand(3, 8),
                "#ffd966", "rgba(255,69,0,0)"
            ));
        }

        for (let i = 0; i < 10; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(80, 180);
            const vel = new Vec2(Math.cos(a) * speed, Math.sin(a) * speed);
            game.effects.push(new Particle(
                pos.clone(), vel, rand(0.6, 1.2), rand(4, 10),
                "#ffaa33", "rgba(255,140,0,0)", 0.6, 80
            ));
        }

        game.effects.push(new RadialRing(pos.clone(), radius * 0.2, radius * 1.1, 0.35, "#e3e3e3"));
    }
}