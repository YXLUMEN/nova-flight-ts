import {World} from "../World.ts";
import {MutVec2} from "../math/MutVec2.ts";
import {BulletEntity} from "../entity/BulletEntity.ts";
import type {Entity} from "../entity/Entity.ts";
import {BaseWeapon} from "./BaseWeapon.ts";

export class Cannon40Weapon extends BaseWeapon {
    public bulletVel = new MutVec2(0, -500);

    public constructor(owner: Entity) {
        super(owner, 2, 0.15);
    }

    public override tryFire(world: World) {
        const pos = new MutVec2(this.owner.pos.x, this.owner.pos.y - this.owner.boxRadius - 6);
        Cannon40Weapon.spawnBullet(world, pos, this.bulletVel, this.owner, this.getDamage(), 6);

        this.setCooldown(this.getFireRate());
    }

    public getDisplayName(): string {
        return '40mm机炮';
    }

    public getUiColor(): string {
        return '#fff';
    }

    public static spawnBullet(world: World, pos: MutVec2, vel: MutVec2, own: Entity, damage: number, radius: number) {
        const b = new BulletEntity(world, pos, vel, own, damage, radius);
        world.bullets.push(b);
    }
}
