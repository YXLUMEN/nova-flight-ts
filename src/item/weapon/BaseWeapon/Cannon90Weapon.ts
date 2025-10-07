import {World} from "../../../world/World.ts";
import {ExplodeBulletEntity} from "../../../entity/projectile/ExplodeBulletEntity.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";

export class Cannon90Weapon extends BaseWeapon {
    private readonly speed = 16;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        const bullet = new ExplodeBulletEntity(EntityTypes.EXPLODE_BULLET_ENTITY,
            world, attacker, stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1), {
                explosionRadius: stack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 16),
                damage: stack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 5),
                sparks: 4,
                fastSparks: 2,
            });

        this.setBullet(bullet, attacker, this.speed, 12);
        if (!world.isClient) (world as ServerWorld).spawnEntity(bullet);

        world.playSound(attacker, SoundEvents.CANNON90_FIRE, 0.5);
        this.setCooldown(stack, this.getFireRate(stack));
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