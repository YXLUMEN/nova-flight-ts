import {Weapon} from "./Weapon.ts";
import type {Entity} from "../entity/Entity.ts";
import {Cannon40Weapon} from "./Cannon40Weapon.ts";
import {Vec2} from "../math/Vec2.ts";
import type {IBaseWeapon} from "./IBaseWeapon.ts";
import type {World} from "../World.ts";

export class MiniGunWeapon extends Weapon implements IBaseWeapon {
    public fireRate = 0.05;
    public bulletVel = new Vec2(0, -520);

    constructor(owner: Entity) {
        super(owner, 1, 0.05);
    }

    public tryFire(world: World): void {
        if (this.getCooldown() > 0) return;

        const pos = new Vec2(this.owner.pos.x, this.owner.pos.y - this.owner.boxRadius - 4);
        Cannon40Weapon.spawnBullet(world, pos, this.bulletVel, this.owner, this.getDamage(), 4);

        this.setCooldown(this.fireRate);
    }

    public getFireRate(): number {
        return this.fireRate;
    }

    public getDisplayName(): string {
        return 'MiniGun';
    }

    public getUiColor(): string {
        return '#dcdcdc';
    }
}