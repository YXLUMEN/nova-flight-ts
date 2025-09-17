import {type World} from "../../../world/World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {MiniBulletEntity} from "../../../entity/projectile/MiniBulletEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {SoundSystem} from "../../../sound/SoundSystem.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";

export class MiniGunWeapon extends BaseWeapon {
    private speed = 18;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        const bullet = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, attacker, stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1));
        this.setBullet(bullet, attacker, this.speed, 4, 5);
        world.spawnEntity(bullet);

        this.setCooldown(stack, this.getFireRate(stack));
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