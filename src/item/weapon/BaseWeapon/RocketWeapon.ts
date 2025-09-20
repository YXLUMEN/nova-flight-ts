import {BaseWeapon} from "./BaseWeapon.ts";
import type {World} from "../../../world/World.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {RocketEntity} from "../../../entity/projectile/RocketEntity.ts";
import {EMPRocketEntity} from "../../../entity/projectile/EMPRocketEntity.ts";
import {BurstRocketEntity} from "../../../entity/projectile/BurstRocketEntity.ts";
import {APRocketEntity} from "../../../entity/projectile/APRocketEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {ClusterRocketEntity} from "../../../entity/projectile/ClusterRocketEntity.ts";

export class RocketWeapon extends BaseWeapon {
    private static readonly BULLET_SPEED: number = 6;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        stack.set(DataComponentTypes.WEAPON_CAN_COOLDOWN, false);

        const rocketCounts = stack.getOrDefault(DataComponentTypes.MISSILE_COUNT, 8);
        const randomRocketEnable = stack.getOrDefault(DataComponentTypes.MISSILE_RANDOM_ENABLE, false);

        let i = 1;
        const schedule = world.scheduleInterval(0.1, () => {
            if (i++ > rocketCounts) {
                schedule.cancel();
                stack.set(DataComponentTypes.WEAPON_CAN_COOLDOWN, true);
                return;
            }

            const yaw = attacker.getYaw();

            let rocket = null;
            if (randomRocketEnable) {
                rocket = this.randomRocket(world, attacker);
            }
            if (rocket === null) {
                rocket = new RocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker);
                rocket.explosionDamage = stack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 12);
                rocket.explosionRadius = stack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 72);
            }
            this.setBullet(rocket, attacker, RocketWeapon.BULLET_SPEED, yaw, 2);
            world.spawnEntity(rocket);

            attacker.updateVelocity(-0.6, Math.cos(yaw), Math.sin(yaw));
        });

        world.playSound(SoundEvents.MISSILE_LAUNCH, 0.5);
        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    private randomRocket(world: World, attacker: Entity): RocketEntity | null {
        const rnd = Math.random();
        if (rnd < 0.1) {
            return new EMPRocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker, 1);
        } else if (rnd < 0.3) {
            return new BurstRocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker, 4);
        } else if (rnd < 0.4) {
            return new APRocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker);
        } else if (rnd < 0.6) {
            return new ClusterRocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker, 8, 100);
        }
        return null;
    }

    public override getDisplayName(): string {
        return "火箭发射器";
    }

    public override getUiColor(): string {
        return "#ffdc92";
    }

    public override getBallisticSpeed(): number {
        return RocketWeapon.BULLET_SPEED;
    }

    public override shouldCooldown(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.WEAPON_CAN_COOLDOWN, false);
    }
}