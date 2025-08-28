import type {Entity} from "../entity/Entity.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import type {World} from "../World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {MiniBulletEntity} from "../entity/projectile/MiniBulletEntity.ts";

export class MiniGunWeapon extends BaseWeapon {
    public bulletVel = new MutVec2(0, -520);

    constructor(owner: Entity) {
        super(owner, 1, 0.05);
    }

    public tryFire(world: World): void {
        const pos = this.owner.getMutPos;
        const bullet = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, this.owner, this.getDamage());
        bullet.setVelocity(Vec2.formVec(this.bulletVel));
        bullet.setPos(pos.x, pos.y - this.owner.getEntityHeight() - 4);
        world.spawnEntity(bullet);

        this.setCooldown(this.getFireRate());
    }

    public getDisplayName(): string {
        return 'MiniGun';
    }

    public getUiColor(): string {
        return '#dcdcdc';
    }
}