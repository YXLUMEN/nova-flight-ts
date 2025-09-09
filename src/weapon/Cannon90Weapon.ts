import {World} from "../world/World.ts";
import {ExplodeBulletEntity} from "../entity/projectile/ExplodeBulletEntity.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";

export class Cannon90Weapon extends BaseWeapon {
    public explosionDamage = 5;
    public explosionRadius = 96;
    private speed = 6.4;

    public constructor(owner: LivingEntity) {
        super(owner, 4, 42);
    }

    public override tryFire(world: World): void {
        const bullet = new ExplodeBulletEntity(EntityTypes.EXPLODE_BULLET_ENTITY,
            world, this.owner, this.getDamage(), {
                explosionRadius: this.explosionRadius,
                damage: this.explosionDamage,
                sparks: 4,
                fastSparks: 2,
            });

        this.setBullet(bullet, this.speed, 12);
        world.spawnEntity(bullet);
        SoundSystem.playSound(SoundEvents.CANNON90_FIRE);

        this.setCooldown(this.getFireRate());
    }

    public override getDisplayName(): string {
        return "90mm机炮";
    }

    public override getUiColor(): string {
        return "#ffcb6a";
    }

    public override getBallisticSpeed(): number {
        return this.speed;
    }
}