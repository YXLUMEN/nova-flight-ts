import {Weapon} from "./Weapon.ts";
import {World} from "../World.ts";
import type {Entity} from "../entity/Entity.ts";
import type {IBaseWeapon} from "./IBaseWeapon.ts";
import {Vec2} from "../math/Vec2.ts";
import {ExplodeBulletEntity} from "../entity/projectile/ExplodeBulletEntity.ts";

export class Cannon90Weapon extends Weapon implements IBaseWeapon {
    public fireRate = 0.8;
    public bulletVel = new Vec2(0, -320);

    public constructor(owner: Entity) {
        super(owner, 4, 0.8);
    }

    public override tryFire(world: World): void {
        if (this.getCooldown() > 0) return;

        const pos = new Vec2(this.owner.pos.x, this.owner.pos.y - this.owner.boxRadius - 12);
        ExplodeBulletEntity.spawnExplodeBullet(world, pos, this.bulletVel, this.owner, this.getDamage(), 12, {
            visionRadius: 64,
            sparks: 4,
            fastSparks: 2,
        });

        this.setCooldown(this.fireRate);
    }

    public getFireRate(): number {
        return this.fireRate;
    }

    public override getDisplayName(): string {
        return "90mm机炮";
    }

    public override getUiColor(): string {
        return "#ffcb6a";
    }
}