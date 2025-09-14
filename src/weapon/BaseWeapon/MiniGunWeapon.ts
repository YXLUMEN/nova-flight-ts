import {type World} from "../../world/World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {MiniBulletEntity} from "../../entity/projectile/MiniBulletEntity.ts";
import type {LivingEntity} from "../../entity/LivingEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";

export class MiniGunWeapon extends BaseWeapon {
    private speed = 18;

    public constructor(owner: LivingEntity) {
        super(owner, 1, 3);
    }

    public override tryFire(world: World): void {
        const bullet = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, this.owner, this.getDamage());
        this.setBullet(bullet, this.speed, 4);
        world.spawnEntity(bullet);

        this.setCooldown(this.getFireRate());
    }

    public override onStartFire(_world: World) {
        SoundSystem.playLoopSound(SoundEvents.MINIGUN_FIRE_LOOP);
    }

    public override onEndFire(_world: World) {
        if (SoundSystem.stopLoopSound(SoundEvents.MINIGUN_FIRE_LOOP)) {
            SoundSystem.playSound(SoundEvents.MINIGUN_FIRE_TAIL);
        }
    }

    public override getDisplayName(): string {
        return 'MiniGun';
    }

    public override getUiColor(): string {
        return '#dcdcdc';
    }

    public override getBallisticSpeed(): number {
        return this.speed;
    }
}