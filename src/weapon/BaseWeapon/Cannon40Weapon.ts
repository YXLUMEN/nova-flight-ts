import {World} from "../../world/World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {BulletEntity} from "../../entity/projectile/BulletEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import type {LivingEntity} from "../../entity/LivingEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";

export class Cannon40Weapon extends BaseWeapon {
    private speed = 14;

    public constructor(owner: LivingEntity) {
        super(owner, 2, 8);
    }

    public override tryFire(world: World) {
        const bullet = new BulletEntity(EntityTypes.BULLET_ENTITY, world, this.owner, this.getDamage());
        this.setBullet(bullet, this.speed, 6);
        world.spawnEntity(bullet);

        this.setCooldown(this.getFireRate());
    }

    public override onStartFire(_world: World) {
        SoundSystem.playLoopSound(SoundEvents.CANNON40_FIRE_LOOP, 0.3);
    }

    public override onEndFire(_world: World) {
        if (SoundSystem.stopLoopSound(SoundEvents.CANNON40_FIRE_LOOP)) {
            SoundSystem.playSound(SoundEvents.CANNON40_FIRE_TAIL, 0.3);
        }
    }

    public getDisplayName(): string {
        return '40mm机炮';
    }

    public getUiColor(): string {
        return '#fff';
    }

    public override getBallisticSpeed(): number {
        return this.speed;
    }
}
