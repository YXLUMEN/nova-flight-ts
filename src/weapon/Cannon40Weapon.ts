import {World} from "../world/World.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {BulletEntity} from "../entity/projectile/BulletEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";

export class Cannon40Weapon extends BaseWeapon {
    public bulletVel = new MutVec2(0, -10);

    public constructor(owner: LivingEntity) {
        super(owner, 2, 8);
    }

    public override tryFire(world: World) {
        const pos = this.owner.getPos();

        const bullet = new BulletEntity(EntityTypes.BULLET_ENTITY, world, this.owner, this.getDamage());
        bullet.setVelocity(this.bulletVel);
        bullet.setPos(pos.x, pos.y - this.owner.getEntityWidth() - 6);
        world.spawnEntity(bullet);

        this.setCooldown(this.getFireRate());
        SoundSystem.playSound(SoundEvents.CANNON40_FIRE);
        SoundSystem.playSound(SoundEvents.CANNON40_FIRE_NX);
        SoundSystem.playSound(SoundEvents.CANNON40_FIRE_MECH);
    }

    public getDisplayName(): string {
        return '40mm机炮';
    }

    public getUiColor(): string {
        return '#fff';
    }
}
