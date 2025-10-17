import {type World} from "../../../world/World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {MiniBulletEntity} from "../../../entity/projectile/MiniBulletEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";

export class MiniGunWeapon extends BaseWeapon {
    private readonly speed = 45;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        const bullet = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, attacker, stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1));
        this.setBullet(bullet, attacker, this.speed, 4, 5);
        if (!world.isClient) (world as ServerWorld).spawnEntity(bullet);

        this.setCooldown(stack, this.getFireRate(stack));
    }

    public override onStartFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        world.playLoopSound(attacker, SoundEvents.MINIGUN_FIRE_LOOP);
    }

    public override onEndFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        if (world.stopLoopSound(attacker, SoundEvents.MINIGUN_FIRE_LOOP)) {
            world.playSound(attacker, SoundEvents.MINIGUN_FIRE_TAIL);
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