import type {Entity} from "../entity/Entity.ts";
import {Cannon40Weapon} from "./Cannon40Weapon.ts";
import {MutVec2} from "../math/MutVec2.ts";
import type {World} from "../World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";

export class MiniGunWeapon extends BaseWeapon {
    public bulletVel = new MutVec2(0, -520);

    constructor(owner: Entity) {
        super(owner, 1, 0.05);
    }

    public tryFire(world: World): void {
        const pos = new MutVec2(this.owner.pos.x, this.owner.pos.y - this.owner.boxRadius - 4);
        Cannon40Weapon.spawnBullet(world, pos, this.bulletVel, this.owner, this.getDamage(), 4);

        this.setCooldown(this.getFireRate());
    }

    public getDisplayName(): string {
        return 'MiniGun';
    }

    public getUiColor(): string {
        return '#dcdcdc';
    }
}