import {World} from "../../../world/World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {BulletEntity} from "../../../entity/projectile/BulletEntity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";

export class Cannon40Weapon extends BaseWeapon {
    private readonly speed = 14;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        const bullet = new BulletEntity(EntityTypes.BULLET_ENTITY, world, attacker, stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 3));
        this.setBullet(bullet, attacker, this.speed, 6, 2);
        if (!world.isClient) (world as ServerWorld).spawnEntity(bullet);

        this.setCooldown(stack, this.getFireRate(stack));
    }

    public override onStartFire(world: World) {
        world.playLoopSound(SoundEvents.CANNON40_FIRE_LOOP, 0.3);
    }

    public override onEndFire(world: World) {
        if (world.stopLoopSound(SoundEvents.CANNON40_FIRE_LOOP)) {
            world.playSound(SoundEvents.CANNON40_FIRE_TAIL, 0.3);
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
