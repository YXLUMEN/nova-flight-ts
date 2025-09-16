import {BaseWeapon} from "./BaseWeapon.ts";
import type {World} from "../../../world/World.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {RocketEntity} from "../../../entity/projectile/RocketEntity.ts";
import {EMPRocketEntity} from "../../../entity/projectile/EMPRocketEntity.ts";
import {BurstRocketEntity} from "../../../entity/projectile/BurstRocketEntity.ts";
import {APRocketEntity} from "../../../entity/projectile/APRocketEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {SoundSystem} from "../../../sound/SoundSystem.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";

export class RocketWeapon extends BaseWeapon {
    private speed: number = 6;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        stack.set(DataComponentTypes.MISSILE_FINISH_SHOOTING, false);

        const rocketCounts = stack.getOrDefault(DataComponentTypes.MISSILE_COUNT, 8);
        const randomRocketEnable = stack.getOrDefault(DataComponentTypes.MISSILE_RANDOM_ENABLE, false);
        const explosionDamage = stack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 12);
        const explosionRadius = stack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 72);

        let i = 1;
        const schedule = world.scheduleInterval(0.1, () => {
            if (i++ > rocketCounts) {
                schedule.cancel();
                stack.set(DataComponentTypes.MISSILE_FINISH_SHOOTING, true);
                return;
            }

            const yaw = attacker.getYaw();

            let rocket;
            if (randomRocketEnable) {
                rocket = this.randomRocket(world, attacker, explosionDamage, explosionRadius);
            } else {
                rocket = new RocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker);
                rocket.explosionDamage = stack.getOrDefault(explosionDamage, 12);
                rocket.explosionRadius = stack.getOrDefault(explosionRadius, 72);
            }
            this.setBullet(rocket, attacker, 6, yaw);
            world.spawnEntity(rocket);

            attacker.updateVelocity(-0.6, Math.cos(yaw), Math.sin(yaw));
        });

        SoundSystem.playSound(SoundEvents.MISSILE_LAUNCH, 0.2);
        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    private randomRocket(world: World, attacker: Entity, explosionDamage: number, explosionRadius: number) {
        const rnd = Math.random();
        if (rnd < 0.1) {
            return new EMPRocketEntity(EntityTypes.EMP_ROCKET_ENTITY, world, attacker);
        } else if (rnd < 0.3) {
            return new BurstRocketEntity(EntityTypes.BURST_ROCKET_ENTITY, world, attacker);
        } else if (rnd < 0.4) {
            return new APRocketEntity(EntityTypes.AP_ROCKET_ENTITY, world, attacker);
        } else {
            const rocket = new RocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker);
            rocket.explosionDamage = explosionDamage;
            rocket.explosionRadius = explosionRadius;
            return rocket;
        }
    }

    public override getDisplayName(): string {
        return "火箭发射器";
    }

    public override getUiColor(): string {
        return "#ffdc92";
    }

    public override getBallisticSpeed(): number {
        return this.speed;
    }

    public override shouldCooldown(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.MISSILE_FINISH_SHOOTING, false);
    }
}