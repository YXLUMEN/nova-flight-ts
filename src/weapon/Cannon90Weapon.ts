import {Weapon} from "./Weapon.ts";
import {World} from "../World.ts";
import type {Entity} from "../entity/Entity.ts";
import type {IBaseWeapon} from "./IBaseWeapon.ts";
import {Vec2} from "../math/Vec2.ts";
import {ExplodeBulletEntity} from "../entity/projectile/ExplodeBulletEntity.ts";

export class Cannon90Weapon extends Weapon implements IBaseWeapon {
    public readonly fireRate = 0.6;

    public constructor(owner: Entity) {
        super(owner, 4, 0.6);
    }

    public tryFire(): void {
        if (this.getCooldown() > 0) return;

        const pos = new Vec2(this.owner.pos.x, this.owner.pos.y - this.owner.radius - 12);
        const vel = new Vec2(0, -320);
        Cannon90Weapon.spawnExplodeBullet(pos, vel, this.owner, this.getDamage(), 12, 64);
        this.setCooldown(this.fireRate);
    }

    public getDisplayName(): string {
        return "90mm机炮";
    }

    public getUiColor(): string {
        return "#ffcb6a";
    }

    public static spawnExplodeBullet(pos: Vec2, vel: Vec2, own: Entity, damage: number, radius: number, explodeRadius: number): void {
        const b = new ExplodeBulletEntity(pos, vel, own, damage, radius, explodeRadius);
        b.color = '#ffb122';
        World.instance.bullets.push(b);
    }
}