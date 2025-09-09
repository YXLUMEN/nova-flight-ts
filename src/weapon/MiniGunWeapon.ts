import type {World} from "../world/World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {MiniBulletEntity} from "../entity/projectile/MiniBulletEntity.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";

export class MiniGunWeapon extends BaseWeapon {
    private speed = 18;

    constructor(owner: LivingEntity) {
        super(owner, 1, 3);
    }

    public tryFire(world: World): void {
        const bullet = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, this.owner, this.getDamage());
        this.setBullet(bullet, this.speed, 4);
        world.spawnEntity(bullet);

        SoundSystem.playSound(SoundEvents.MINIGUN_FIRE);
        this.setCooldown(this.getFireRate());
    }

    public getDisplayName(): string {
        return 'MiniGun';
    }

    public getUiColor(): string {
        return '#dcdcdc';
    }

    public override getBallisticSpeed(): number {
        return this.speed;
    }
}