import {World} from "../../../world/World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {FastBulletEntity} from "../../../entity/projectile/FastBulletEntity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";

export class Cannon40Weapon extends BaseWeapon {
    private readonly speed = 35;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity) {
        const bullet = new FastBulletEntity(EntityTypes.FAST_BULLET_ENTITY, world, attacker, stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 3));
        this.setBullet(bullet, attacker, this.speed, 6, 2);
        world.spawnEntity(bullet);
    }

    public override onStartFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        world.playLoopSound(attacker, SoundEvents.CANNON40_FIRE_LOOP, 0.3);
    }

    public override onEndFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        if (world.stopLoopSound(attacker, SoundEvents.CANNON40_FIRE_LOOP)) {
            world.playSound(attacker, SoundEvents.CANNON40_FIRE_TAIL, 0.3);
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
