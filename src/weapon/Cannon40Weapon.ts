import {World} from "../World.ts";
import {Weapon} from "./Weapon.ts";
import {Vec2} from "../math/Vec2.ts";
import {BulletEntity} from "../entity/projectile/BulletEntity.ts";
import type {Entity} from "../entity/Entity.ts";
import type {IBaseWeapon} from "./IBaseWeapon.ts";

export class Cannon40Weapon extends Weapon implements IBaseWeapon {
    public readonly fireRate = 0.15;

    public constructor(owner: Entity) {
        super(owner, 2, 0.15);
    }

    public override tryFire() {
        if (this.getCooldown() > 0) return;

        const pos = new Vec2(this.owner.pos.x, this.owner.pos.y - this.owner.radius - 6);
        const vel = new Vec2(0, -520);
        Cannon40Weapon.spawnBullet(pos, vel, this.owner, this.getDamage(), 6);
        this.setCooldown(this.fireRate);
    }

    public getDisplayName(): string {
        return '40mm机炮';
    }

    public getUiColor(): string {
        return '#fff';
    }

    public static spawnBullet(pos: Vec2, vel: Vec2, own: Entity, damage: number, radius: number) {
        const b = new BulletEntity(pos, vel, own, damage, radius);
        World.instance.bullets.push(b);
    }
}
