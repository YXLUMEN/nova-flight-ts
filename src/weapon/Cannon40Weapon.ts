import {World} from "../World.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import type {Entity} from "../entity/Entity.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {BulletEntity} from "../entity/projectile/BulletEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";

export class Cannon40Weapon extends BaseWeapon {
    public bulletVel = new MutVec2(0, -500);

    public constructor(owner: Entity) {
        super(owner, 2, 0.15);
    }

    public override tryFire(world: World) {
        const pos = this.owner.getPos();
        const bullet = new BulletEntity(EntityTypes.BULLET_ENTITY, world, this.owner, this.getDamage());
        bullet.setVelocity(this.bulletVel);
        bullet.setPos(pos.x, pos.y - this.owner.getDimensions().height - 6);
        world.spawnEntity(bullet);

        this.setCooldown(this.getFireRate());
    }

    public getDisplayName(): string {
        return '40mm机炮';
    }

    public getUiColor(): string {
        return '#fff';
    }
}
