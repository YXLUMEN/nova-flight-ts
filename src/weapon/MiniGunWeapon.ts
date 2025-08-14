import {Weapon} from "./Weapon.ts";
import type {Entity} from "../entity/Entity.ts";
import {Cannon40Weapon} from "./Cannon40Weapon.ts";
import {Vec2} from "../math/Vec2.ts";
import type {IBaseWeapon} from "./IBaseWeapon.ts";

export class MiniGunWeapon extends Weapon implements IBaseWeapon {
    public readonly fireRate = 0.05;

    constructor(owner: Entity) {
        super(owner, 1, 0.05);
    }

    public tryFire(): void {
        if (this.getCooldown() > 0) return;

        const pos = new Vec2(this.owner.pos.x, this.owner.pos.y - this.owner.radius - 4);
        const vel = new Vec2(0, -520);
        Cannon40Weapon.spawnBullet(pos, vel, this.owner, this.getDamage(), 4);
        this.setCooldown(this.fireRate);
    }

    public getDisplayName(): string {
        return 'MiniGun';
    }

    public getUiColor(): string {
        return '#dcdcdc';
    }
}